import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with API key
const getGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Generate embeddings for text using Gemini
 * @param text - Text to generate embeddings for
 * @param taskType - Type of task ('RETRIEVAL_DOCUMENT' or 'RETRIEVAL_QUERY')
 * @returns Normalized embedding vector of length 768
 */
export const generateEmbedding = async (
  text: string, 
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> => {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const result = await model.embedContent({
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: 768,
    });

    const embedding = result.embedding.values;
    
    if (!embedding || embedding.length === 0) {
      throw new Error('No embedding returned from Gemini API');
    }

    // Normalize the embedding vector (unit norm)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = embedding.map(val => val / norm);

    return normalizedEmbedding;

  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate chat completion using Gemini Flash 2.0
 * @param prompt - The user prompt
 * @param context - Context chunks for RAG
 * @param systemPrompt - System prompt (optional)
 * @returns Generated response
 */
export const generateChatCompletion = async (
  prompt: string,
  context: Array<{ id: string; section_path?: string; content: string }> = [],
  systemPrompt?: string
): Promise<string> => {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: systemPrompt || `You are a compliance assistant. Answer only with facts from the provided context. Always cite your sources using section numbers and effective dates when available.`
    });

    // Build the full prompt with context
    let fullPrompt = prompt;
    
    if (context.length > 0) {
      const contextText = context.map((chunk, index) => 
        `[${index + 1}] ${chunk.section_path ? `Section: ${chunk.section_path}` : ''}\n${chunk.content}`
      ).join('\n\n');
      
      fullPrompt = `${prompt}\n\n---\nContext:\n${contextText}`;
    }

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    
    if (!response || !response.text()) {
      throw new Error('No response generated from Gemini');
    }

    return response.text();

  } catch (error) {
    console.error('Error generating chat completion:', error);
    throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Count tokens in text (approximate)
 * Since Gemini doesn't have a direct token counting API, we'll use a rough approximation
 * @param text - Text to count tokens for
 * @returns Approximate token count
 */
export const countTokens = (text: string): number => {
  // Rough approximation: 1 token ≈ 4 characters for English text
  // This is an approximation and may not be exact
  const roughTokenCount = Math.ceil(text.length / 4);
  
  // Add some buffer for special tokens, punctuation, etc.
  return Math.ceil(roughTokenCount * 1.2);
};

/**
 * Chunk text for processing with overlaps
 * @param text - Text to chunk
 * @param maxTokens - Maximum tokens per chunk (default: 800)
 * @param overlapTokens - Overlap between chunks (default: 100)
 * @returns Array of text chunks with metadata
 */
export const chunkText = (
  text: string, 
  maxTokens: number = 800, 
  overlapTokens: number = 100
): Array<{ content: string; tokens: number; start: number; end: number }> => {
  const chunks: Array<{ content: string; tokens: number; start: number; end: number }> = [];
  
  // Convert tokens to approximate character count
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;
  
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChars;
    
    // Don't split in the middle of words or sentences
    if (end < text.length) {
      // Try to end at a sentence boundary
      const lastSentenceEnd = text.lastIndexOf('.', end);
      const lastQuestionEnd = text.lastIndexOf('?', end);
      const lastExclamationEnd = text.lastIndexOf('!', end);
      
      const sentenceEnd = Math.max(lastSentenceEnd, lastQuestionEnd, lastExclamationEnd);
      
      if (sentenceEnd > start + (maxChars * 0.5)) {
        end = sentenceEnd + 1;
      } else {
        // Fall back to word boundary
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
    
    // Move start position with overlap
    start = Math.max(start + 1, end - overlapChars);
    
    // Prevent infinite loop
    if (start >= text.length) break;
  }
  
  return chunks;
};
