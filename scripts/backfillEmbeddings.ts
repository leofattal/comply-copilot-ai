#!/usr/bin/env tsx

/**
 * Backfill Embeddings Script
 * 
 * This script generates embeddings for doc_chunks that don't have them or have
 * embeddings of the wrong dimension (not 768).
 * 
 * Usage:
 *   npm run backfill-embeddings
 *   
 * Or with custom parameters:
 *   npm run backfill-embeddings -- --batch-size 50 --delay 200
 */

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../src/lib/gemini';

// Configuration
interface Config {
  batchSize: number;
  delayMs: number;
  dryRun: boolean;
  maxRetries: number;
}

const defaultConfig: Config = {
  batchSize: 20,
  delayMs: 100,
  dryRun: false,
  maxRetries: 3,
};

// Database types
interface DocChunk {
  chunk_id: number;
  doc_id: string;
  content: string;
  tokens: number | null;
  embedding: number[] | null;
}

// Parse command line arguments
function parseArgs(): Partial<Config> {
  const args = process.argv.slice(2);
  const config: Partial<Config> = {};

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--batch-size':
        config.batchSize = parseInt(value, 10);
        break;
      case '--delay':
        config.delayMs = parseInt(value, 10);
        break;
      case '--dry-run':
        config.dryRun = true;
        i--; // No value for this flag
        break;
      case '--max-retries':
        config.maxRetries = parseInt(value, 10);
        break;
      default:
        if (flag.startsWith('--')) {
          console.warn(`Unknown flag: ${flag}`);
        }
    }
  }

  return config;
}

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Check if embedding is valid (length 768 and contains numbers)
function isValidEmbedding(embedding: number[] | null): boolean {
  return (
    embedding !== null &&
    Array.isArray(embedding) &&
    embedding.length === 768 &&
    embedding.every(val => typeof val === 'number' && !isNaN(val))
  );
}

// Generate embedding with retries
async function generateEmbeddingWithRetries(
  content: string,
  chunkId: number,
  maxRetries: number
): Promise<number[] | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Generating embedding for chunk ${chunkId} (attempt ${attempt}/${maxRetries})`);
      const embedding = await generateEmbedding(content, 'RETRIEVAL_DOCUMENT');
      
      if (!isValidEmbedding(embedding)) {
        throw new Error('Invalid embedding generated');
      }
      
      return embedding;
    } catch (error) {
      console.error(`  Error generating embedding for chunk ${chunkId} (attempt ${attempt}):`, 
        error instanceof Error ? error.message : 'Unknown error');
      
      if (attempt === maxRetries) {
        console.error(`  Failed to generate embedding for chunk ${chunkId} after ${maxRetries} attempts`);
        return null;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return null;
}

// Update chunk with new embedding
async function updateChunkEmbedding(
  supabase: any,
  chunkId: number,
  embedding: number[],
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would update chunk ${chunkId} with embedding of length ${embedding.length}`);
    return true;
  }

  try {
    const { error } = await supabase
      .from('doc_chunks')
      .update({ embedding })
      .eq('chunk_id', chunkId);

    if (error) {
      console.error(`  Error updating chunk ${chunkId}:`, error.message);
      return false;
    }

    console.log(`  ✓ Updated chunk ${chunkId} with embedding`);
    return true;
  } catch (error) {
    console.error(`  Error updating chunk ${chunkId}:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Main backfill function
async function backfillEmbeddings() {
  const config = { ...defaultConfig, ...parseArgs() };
  console.log('Backfill Embeddings Script');
  console.log('Configuration:', config);
  console.log('');

  if (config.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to the database');
    console.log('');
  }

  try {
    // Initialize clients
    const supabase = initializeSupabase();
    
    // Check Gemini API key
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }

    console.log('✓ Supabase client initialized');
    console.log('✓ Gemini API key found');
    console.log('');

    // Find chunks that need embeddings
    console.log('🔍 Finding chunks that need embeddings...');
    
    const { data: chunks, error: fetchError } = await supabase
      .from('doc_chunks')
      .select('chunk_id, doc_id, content, tokens, embedding')
      .or('embedding.is.null,embedding->0.is.null')
      .order('chunk_id');

    if (fetchError) {
      throw new Error(`Failed to fetch chunks: ${fetchError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      console.log('✅ No chunks found that need embeddings. All done!');
      return;
    }

    // Filter out chunks with invalid embeddings
    const chunksNeedingEmbeddings = chunks.filter((chunk: DocChunk) => 
      !isValidEmbedding(chunk.embedding)
    );

    console.log(`📊 Found ${chunksNeedingEmbeddings.length} chunks that need embeddings`);
    console.log('');

    if (chunksNeedingEmbeddings.length === 0) {
      console.log('✅ All chunks already have valid embeddings. Nothing to do!');
      return;
    }

    // Process chunks in batches
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < chunksNeedingEmbeddings.length; i += config.batchSize) {
      const batch = chunksNeedingEmbeddings.slice(i, i + config.batchSize);
      const batchNum = Math.floor(i / config.batchSize) + 1;
      const totalBatches = Math.ceil(chunksNeedingEmbeddings.length / config.batchSize);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)`);

      for (const chunk of batch) {
        processed++;
        
        try {
          // Generate embedding
          const embedding = await generateEmbeddingWithRetries(
            chunk.content,
            chunk.chunk_id,
            config.maxRetries
          );

          if (embedding) {
            // Update database
            const updateSuccess = await updateChunkEmbedding(
              supabase,
              chunk.chunk_id,
              embedding,
              config.dryRun
            );

            if (updateSuccess) {
              successful++;
            } else {
              failed++;
            }
          } else {
            failed++;
            console.log(`  ❌ Failed to generate embedding for chunk ${chunk.chunk_id}`);
          }

          // Progress indicator
          const progress = ((processed / chunksNeedingEmbeddings.length) * 100).toFixed(1);
          console.log(`  Progress: ${processed}/${chunksNeedingEmbeddings.length} (${progress}%)`);

          // Rate limiting delay
          if (processed < chunksNeedingEmbeddings.length) {
            await new Promise(resolve => setTimeout(resolve, config.delayMs));
          }

        } catch (error) {
          failed++;
          console.error(`  ❌ Error processing chunk ${chunk.chunk_id}:`, 
            error instanceof Error ? error.message : 'Unknown error');
        }
      }

      console.log(`  Batch ${batchNum} complete\n`);
    }

    // Final summary
    console.log('📈 Backfill Summary:');
    console.log(`  Total chunks processed: ${processed}`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Success rate: ${processed > 0 ? ((successful / processed) * 100).toFixed(1) : 0}%`);

    if (config.dryRun) {
      console.log('\n🔍 This was a dry run. Run without --dry-run to apply changes.');
    } else if (successful > 0) {
      console.log('\n✅ Backfill completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Backfill failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  backfillEmbeddings().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { backfillEmbeddings };
