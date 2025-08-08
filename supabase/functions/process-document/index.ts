import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      docs: {
        Row: {
          doc_id: string;
          uri: string;
          title: string | null;
          uploaded_by: string | null;
          status: 'pending' | 'ready' | 'error';
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Update: {
          status?: 'pending' | 'ready' | 'error';
          error_message?: string | null;
          updated_at?: string;
        };
      };
      doc_chunks: {
        Insert: {
          doc_id: string;
          section_path?: string | null;
          content: string;
          tokens?: number | null;
          embedding?: number[] | null;
        };
      };
    };
  };
}

// Gemini AI functions (simplified for Edge Function environment)
const generateEmbedding = async (text: string): Promise<number[]> => {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text }]
      },
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: 768
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  const embedding = data.embedding?.values;
  
  if (!embedding || embedding.length === 0) {
    throw new Error('No embedding returned from Gemini API');
  }

  // Normalize the embedding vector (unit norm)
  const norm = Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0));
  return embedding.map((val: number) => val / norm);
};

const countTokens = (text: string): number => {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4 * 1.2);
};

const chunkText = (text: string, maxTokens: number = 800, overlapTokens: number = 100) => {
  const chunks: Array<{ content: string; tokens: number; start: number; end: number }> = [];
  
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;
  
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChars;
    
    if (end < text.length) {
      const lastSentenceEnd = text.lastIndexOf('.', end);
      const lastQuestionEnd = text.lastIndexOf('?', end);
      const lastExclamationEnd = text.lastIndexOf('!', end);
      
      const sentenceEnd = Math.max(lastSentenceEnd, lastQuestionEnd, lastExclamationEnd);
      
      if (sentenceEnd > start + (maxChars * 0.5)) {
        end = sentenceEnd + 1;
      } else {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start + (maxChars * 0.5)) {
          end = lastSpace;
        }
      }
    }
    
    const chunkContent = text.slice(start, end).trim();
    
    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        tokens: countTokens(chunkContent),
        start,
        end
      });
    }
    
    start = Math.max(start + 1, end - overlapChars);
    if (start >= text.length) break;
  }
  
  return chunks;
};

// Text extraction functions
const extractPdfText = async (buffer: Uint8Array): Promise<string> => {
  // For now, return a placeholder - in production you'd use a PDF parsing library
  // that works in Deno environment
  throw new Error('PDF extraction not yet implemented in Edge Function environment');
};

const extractDocxText = async (buffer: Uint8Array): Promise<string> => {
  // For now, return a placeholder - in production you'd use a DOCX parsing library
  // that works in Deno environment
  throw new Error('DOCX extraction not yet implemented in Edge Function environment');
};

const extractHtmlText = async (content: string): Promise<string> => {
  // Simple HTML text extraction using regex (basic implementation)
  // Remove HTML tags and decode entities
  let text = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Basic HTML entity decoding
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return text;
};

const extractTextFromFile = async (
  fileContent: Uint8Array | string, 
  mimeType: string,
  fileName: string
): Promise<{ text: string; sections: Array<{ path: string; content: string }> }> => {
  let extractedText = '';
  
  try {
    switch (mimeType) {
      case 'application/pdf':
        extractedText = await extractPdfText(fileContent as Uint8Array);
        break;
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        extractedText = await extractDocxText(fileContent as Uint8Array);
        break;
      
      case 'text/html':
        extractedText = await extractHtmlText(fileContent as string);
        break;
      
      case 'text/plain':
        extractedText = typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent);
        break;
      
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`Error extracting text from ${fileName}:`, error);
    throw error;
  }
  
  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error('No text content extracted from file');
  }
  
  // For now, treat the entire document as one section
  // In production, you might want to detect sections, headers, etc.
  const sections = [{
    path: fileName,
    content: extractedText
  }];
  
  return { text: extractedText, sections };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { doc_id } = await req.json();

    if (!doc_id) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get document info
    const { data: doc, error: docError } = await supabase
      .from('docs')
      .select('*')
      .eq('doc_id', doc_id)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (doc.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Document is not in pending status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      let fileContent: Uint8Array | string;
      let mimeType: string;
      let fileName: string;

      if (doc.uri.startsWith('http')) {
        // Handle URL content - this should have been stored as a file during submission
        // For now, we'll handle it as a URL fetch
        const response = await fetch(doc.uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch URL content: ${response.statusText}`);
        }
        fileContent = await response.text();
        mimeType = 'text/html';
        fileName = doc.title || 'url-content';
      } else {
        // Handle file from storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('compliance-raw')
          .download(doc.uri);

        if (fileError || !fileData) {
          throw new Error(`Failed to download file: ${fileError?.message}`);
        }

        fileContent = new Uint8Array(await fileData.arrayBuffer());
        
        // Determine MIME type from file extension
        const extension = doc.uri.toLowerCase().split('.').pop();
        switch (extension) {
          case 'pdf':
            mimeType = 'application/pdf';
            break;
          case 'docx':
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
          case 'doc':
            mimeType = 'application/msword';
            break;
          case 'html':
          case 'htm':
            mimeType = 'text/html';
            break;
          case 'txt':
            mimeType = 'text/plain';
            break;
          default:
            mimeType = 'text/plain';
        }
        
        fileName = doc.title || doc.uri.split('/').pop() || 'document';
      }

      // Extract text from file
      const { text, sections } = await extractTextFromFile(fileContent, mimeType, fileName);
      
      // Chunk the text
      const chunks = chunkText(text);
      
      if (chunks.length === 0) {
        throw new Error('No chunks generated from document');
      }

      // Process each chunk and generate embeddings
      const chunkInserts = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          // Generate embedding for this chunk
          const embedding = await generateEmbedding(chunk.content);
          
          chunkInserts.push({
            doc_id: doc_id,
            section_path: `Chunk ${i + 1}`,
            content: chunk.content,
            tokens: chunk.tokens,
            embedding: embedding
          });
          
          // Add a small delay to avoid rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (embeddingError) {
          console.error(`Error generating embedding for chunk ${i + 1}:`, embeddingError);
          // Still insert the chunk without embedding
          chunkInserts.push({
            doc_id: doc_id,
            section_path: `Chunk ${i + 1}`,
            content: chunk.content,
            tokens: chunk.tokens,
            embedding: null
          });
        }
      }

      // Insert all chunks
      const { error: chunksError } = await supabase
        .from('doc_chunks')
        .insert(chunkInserts);

      if (chunksError) {
        throw new Error(`Failed to insert chunks: ${chunksError.message}`);
      }

      // Update document status to ready
      const { error: updateError } = await supabase
        .from('docs')
        .update({ 
          status: 'ready',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('doc_id', doc_id);

      if (updateError) {
        console.error('Error updating document status:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Document processed successfully',
          stats: {
            total_chunks: chunks.length,
            total_tokens: chunks.reduce((sum, chunk) => sum + chunk.tokens, 0),
            chunks_with_embeddings: chunkInserts.filter(chunk => chunk.embedding !== null).length
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processingError) {
      console.error('Document processing error:', processingError);
      
      // Update document status to error
      await supabase
        .from('docs')
        .update({ 
          status: 'error',
          error_message: processingError instanceof Error ? processingError.message : 'Processing failed',
          updated_at: new Date().toISOString()
        })
        .eq('doc_id', doc_id);

      return new Response(
        JSON.stringify({ 
          error: 'Document processing failed',
          details: processingError instanceof Error ? processingError.message : 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
