import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      doc_chunks: {
        Row: {
          chunk_id: number;
          doc_id: string;
          section_path: string | null;
          content: string;
          tokens: number | null;
          embedding: number[] | null;
          created_at: string;
        };
      };
      docs: {
        Row: {
          doc_id: string;
          uri: string;
          title: string | null;
          status: 'pending' | 'ready' | 'error';
          created_at: string;
        };
      };
    };
  };
}

interface ContextChunk {
  chunk_id: number;
  doc_id: string;
  doc_title: string | null;
  section_path: string | null;
  content: string;
  similarity: number;
}

// Rough token count approximation
const approxTokenCount = (text: string): number => {
  const rough = Math.ceil((text || '').length / 4);
  return Math.ceil(rough * 1.2);
};

// Restrict context chunks for diversity and token budget, leaving a reasoning reserve
const selectContextWithBudget = (
  chunks: ContextChunk[],
  promptText: string,
  options?: { maxPerDoc?: number; maxChunks?: number; contextWindowTokens?: number; reasoningReserveRatio?: number }
): ContextChunk[] => {
  const maxPerDoc = options?.maxPerDoc ?? 2;
  const maxChunks = options?.maxChunks ?? 10; // pass only 5-10 ideally
  const contextWindowTokens = options?.contextWindowTokens ?? (Number(Deno.env.get('LLM_CONTEXT_WINDOW_TOKENS')) || 8192);
  const reasoningReserveRatio = options?.reasoningReserveRatio ?? (Number(Deno.env.get('LLM_REASONING_RESERVE_RATIO')) || 0.3);

  const allowedInputTokens = Math.max(512,
    Math.floor(contextWindowTokens * (1 - reasoningReserveRatio)) - approxTokenCount(promptText) - 256
  );

  // Enforce doc diversity first
  const docCounts = new Map<string, number>();
  const diversified: ContextChunk[] = [];
  for (const c of chunks) {
    const count = docCounts.get(c.doc_id) || 0;
    if (count < maxPerDoc) {
      diversified.push(c);
      docCounts.set(c.doc_id, count + 1);
      if (diversified.length >= maxChunks) break;
    }
  }

  // Now add until token budget is met
  const selected: ContextChunk[] = [];
  let runningTokens = 0;
  for (const c of diversified) {
    const metadata = `${c.doc_title ? `Document: ${c.doc_title}` : ''}${c.section_path ? ` | Section: ${c.section_path}` : ''}`;
    const chunkText = `[${selected.length + 1}] ${metadata}\n${c.content}`;
    const cost = approxTokenCount(chunkText) + 8; // buffer
    if (runningTokens + cost > allowedInputTokens) break;
    selected.push(c);
    runningTokens += cost;
  }

  return selected;
};

// Simple over-citation detector: large verbatim overlap or excessive quoting
const isOverCitation = (answer: string, contextStrings: string[]): boolean => {
  const answerLen = answer.length || 1;
  let overlapped = 0;
  for (const ctx of contextStrings) {
    if (!ctx) continue;
    const segLen = Math.min(400, Math.floor(ctx.length / 3));
    if (segLen < 200) continue;
    for (let i = 0; i + segLen <= ctx.length; i += segLen) {
      const seg = ctx.slice(i, i + segLen);
      if (seg.length >= 200 && answer.includes(seg)) {
        overlapped += seg.length;
        if (overlapped / answerLen > 0.3) return true;
      }
    }
  }
  const sentences = answer.split(/[.!?]\s+/).filter(Boolean).length || 1;
  const brackets = (answer.match(/\[[0-9]+\]/g) || []).length;
  const quotes = (answer.match(/"[^"]+"/g) || []).length;
  if (brackets > sentences || quotes > sentences / 2) return true;
  return false;
};

// Detect conflict mentions for escalation
const detectConflict = (answer: string): boolean => {
  const text = (answer || '').toLowerCase();
  return text.includes('conflict') || text.includes('contradict');
};

// Parse [n] citations used in the answer
const extractUsedCitationIndices = (answer: string): Set<number> => {
  const indices = new Set<number>();
  const re = /\[([0-9]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    const idx = Number(m[1]);
    if (!Number.isNaN(idx)) indices.add(idx);
  }
  return indices;
};

// From a list of chunks, return at most one chunk per document (best by similarity)
const dedupeByDocument = (chunks: ContextChunk[], maxDocs: number = 3): ContextChunk[] => {
  const byDoc = new Map<string, ContextChunk[]>();
  for (const c of chunks) {
    const arr = byDoc.get(c.doc_id) || [];
    arr.push(c);
    byDoc.set(c.doc_id, arr);
  }
  // Pick best chunk per doc by highest similarity
  const bestPerDoc: ContextChunk[] = [];
  for (const [, arr] of byDoc) {
    const best = arr.reduce((a, b) => (a.similarity >= b.similarity ? a : b));
    bestPerDoc.push(best);
  }
  // Sort docs by their chosen chunk similarity and cap
  bestPerDoc.sort((a, b) => b.similarity - a.similarity);
  return bestPerDoc.slice(0, maxDocs);
};

// Generate query embedding using Gemini
const generateQueryEmbedding = async (text: string): Promise<number[]> => {
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
      taskType: 'RETRIEVAL_QUERY',
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

// Build prompt and call Gemini Flash 2.0
const generateChatCompletion = async (
  prompt: string,
  context: ContextChunk[],
  systemPrompt?: string
): Promise<string> => {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  // Build the full prompt with context (assumes context already selected)
  let contextText = '';
  if (context.length > 0) {
    contextText = context.map((chunk, index) => {
      const docTitle = chunk.doc_title ? `Document: ${chunk.doc_title}` : '';
      const sectionPath = chunk.section_path ? `Section: ${chunk.section_path}` : '';
      const metadata = [docTitle, sectionPath].filter(Boolean).join(' | ');
      return `[${index + 1}] ${metadata}\n${chunk.content}`;
    }).join('\n\n');
  }

  const fullPrompt = contextText
    ? `${prompt}\n\n---\nCONTEXT (use if relevant):\n${contextText}`
    : prompt;

  const body = {
    systemInstruction: systemPrompt ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined,
    contents: [
      {
        role: 'user',
        parts: [{ text: fullPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topK: 32,
      topP: 1,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  } as any;

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response generated from Gemini');
  }
  const candidate = data.candidates[0];
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('No content in response from Gemini');
  }
  return candidate.content.parts[0].text || '';
};

// Perform vector similarity search
const performVectorSearch = async (
  supabase: any,
  queryEmbedding: number[],
  limit: number = 10,
  similarityThreshold: number = 0.3
): Promise<ContextChunk[]> => {
  try {
    // Use the built-in vector similarity search with cosine distance
    const { data: chunks, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: similarityThreshold,
      match_count: limit
    });

    if (error) {
      console.error('Vector search error:', error);
      // Fallback to basic search without RPC function
      return performFallbackSearch(supabase, limit);
    }

    return chunks || [];
  } catch (error) {
    console.error('Vector search failed:', error);
    // Fallback to basic search
    return performFallbackSearch(supabase, limit);
  }
};

// Fallback search without vector similarity
const performFallbackSearch = async (
  supabase: any,
  limit: number
): Promise<ContextChunk[]> => {
  const { data: chunks, error } = await supabase
    .from('doc_chunks')
    .select(`
      chunk_id,
      doc_id,
      section_path,
      content,
      docs!inner(title)
    `)
    .eq('docs.status', 'ready')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Fallback search failed: ${error.message}`);
  }

  return (chunks || []).map((chunk: any) => ({
    chunk_id: chunk.chunk_id,
    doc_id: chunk.doc_id,
    doc_title: chunk.docs?.title,
    section_path: chunk.section_path,
    content: chunk.content,
    similarity: 0.5 // Default similarity for fallback
  }));
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

    const body = await req.json();
    const { 
      query, 
      limit = 10, 
      similarity_threshold = 0.3,
      include_response = true,
      system_prompt,
      ablation = false
    } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Generate query embedding
    console.log('Generating query embedding...');
    const queryEmbedding = await generateQueryEmbedding(query.trim());

    // Perform vector similarity search
    console.log('Performing vector search...');
    const contextChunks = await performVectorSearch(
      supabase,
      queryEmbedding,
      Math.min(limit, 20), // Cap at 20 chunks
      similarity_threshold
    );

    console.log(`Found ${contextChunks.length} relevant chunks`);

    // Select the actual context we will send to the model
    const promptContext = selectContextWithBudget(contextChunks, query);

    let responseText = '';
    let baselineText: string | null = null;
    let responseTime = 0;
    let overCitationRewrite = false;

    if (include_response) {
      // Default system prompt that blends general knowledge and context
      const defaultSystemPrompt = `You are a professional HR-compliance assistant.
Use your general knowledge plus the CONTEXT snippets below.
- Write a concise compliance answer in your own words.
- Cite the specific section when you rely on CONTEXT.
- If CONTEXT contradicts well-established law you know, flag the conflict and explain.
- If key information is missing from both your background knowledge and the CONTEXT, say "insufficient information".
- Use context to support your reasoning; do not quote large passages or cite every sentence.`;

      const effectiveSystemPrompt = system_prompt || defaultSystemPrompt;
      const responseStartTime = Date.now();

      if (ablation) {
        baselineText = await generateChatCompletion(query, [], effectiveSystemPrompt);
      }

      // Generate with promptContext only
      let generated = await generateChatCompletion(query, promptContext, effectiveSystemPrompt);

      // Over-citation detection and one rewrite
      const contextStrings = promptContext.map(c => c.content);
      if (isOverCitation(generated, contextStrings)) {
        overCitationRewrite = true;
        const rewriteInstruction = `${query}\n\nAdditional instruction: Rewrite—use the context to support your reasoning without quoting long passages or citing every sentence. Synthesize in your own words and integrate your prior knowledge.`;
        generated = await generateChatCompletion(rewriteInstruction, promptContext, effectiveSystemPrompt);
      }

      responseText = generated;
      responseTime = Date.now() - responseStartTime;
      console.log(`Response generated in ${responseTime}ms`);
    }

    const totalTime = Date.now() - startTime;

    const conflictDetected = detectConflict(responseText);

    // Filter returned context to only those that were actually cited, if any,
    // then dedupe by document and keep the most relevant passage per doc.
    const usedIndices = extractUsedCitationIndices(responseText);
    const usedChunks = usedIndices.size > 0
      ? promptContext.filter((_, idx) => usedIndices.has(idx + 1))
      : promptContext;

    const returnedContext = dedupeByDocument(usedChunks, 3);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        context: returnedContext.map((chunk) => ({
          chunk_id: chunk.chunk_id,
          doc_id: chunk.doc_id,
          doc_title: chunk.doc_title,
          section_path: chunk.section_path,
          content: chunk.content.length > 500 
            ? `${chunk.content.substring(0, 500)}...` 
            : chunk.content,
          similarity: chunk.similarity
        })),
        response: include_response ? responseText : null,
        baseline_response: ablation ? baselineText : null,
        metadata: {
          total_chunks_found: contextChunks.length,
          query_time: totalTime,
          response_time: responseTime,
          similarity_threshold,
          over_citation_rewrite_applied: overCitationRewrite,
          conflict_detected: conflictDetected,
          escalation_recommended: conflictDetected
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('RAG query error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'RAG query failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
