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

// Generate chat completion using Gemini Flash 2.0
const generateChatCompletion = async (
  prompt: string,
  context: ContextChunk[],
  systemPrompt?: string
): Promise<string> => {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  // Build the full prompt with context
  let fullPrompt = prompt;
  
  if (context.length > 0) {
    const contextText = context.map((chunk, index) => {
      const docTitle = chunk.doc_title ? `Document: ${chunk.doc_title}` : '';
      const sectionPath = chunk.section_path ? `Section: ${chunk.section_path}` : '';
      const metadata = [docTitle, sectionPath].filter(Boolean).join(' | ');
      
      return `[${index + 1}] ${metadata}\n${chunk.content}`;
    }).join('\n\n');
    
    fullPrompt = `${prompt}\n\n---\nContext:\n${contextText}`;
  }

  const messages = [
    {
      role: 'user',
      parts: [{ text: fullPrompt }]
    }
  ];

  if (systemPrompt) {
    messages.unshift({
      role: 'model',
      parts: [{ text: 'I understand. I will act as a compliance assistant and answer only with facts from the provided context, citing sources with section numbers and effective dates when available.' }]
    });
    messages.unshift({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: messages,
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    })
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
      system_prompt 
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

    let response = '';
    let responseTime = 0;

    if (include_response && contextChunks.length > 0) {
      // Generate response using Gemini Flash 2.0
      console.log('Generating response...');
      const responseStartTime = Date.now();
      
      const defaultSystemPrompt = `You are a compliance assistant. Answer the user's question using only the information provided in the context below. Always cite your sources using document titles and section references when available. If the context doesn't contain enough information to answer the question, say so clearly.`;
      
      response = await generateChatCompletion(
        query,
        contextChunks,
        system_prompt || defaultSystemPrompt
      );
      
      responseTime = Date.now() - responseStartTime;
      console.log(`Response generated in ${responseTime}ms`);
    }

    const totalTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        query,
        context: contextChunks.map(chunk => ({
          chunk_id: chunk.chunk_id,
          doc_id: chunk.doc_id,
          doc_title: chunk.doc_title,
          section_path: chunk.section_path,
          content: chunk.content.length > 500 
            ? `${chunk.content.substring(0, 500)}...` 
            : chunk.content,
          similarity: chunk.similarity
        })),
        response: include_response ? response : null,
        metadata: {
          total_chunks_found: contextChunks.length,
          query_time: totalTime,
          response_time: responseTime,
          similarity_threshold
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
