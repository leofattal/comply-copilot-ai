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
      };
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
    };
  };
}

const isAdmin = async (supabase: any, userId: string): Promise<boolean> => {
  // For now, any authenticated user is considered admin
  return !!userId;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(supabase, user.id);
    if (!userIsAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET') {
      // Get documents with chunk statistics
      const { data: documents, error: docsError } = await supabase
        .from('docs')
        .select(`
          doc_id,
          uri,
          title,
          uploaded_by,
          status,
          error_message,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (docsError) {
        console.error('Error fetching documents:', docsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch documents' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get chunk statistics for each document
      const documentsWithStats = await Promise.all(
        (documents || []).map(async (doc) => {
          const { data: chunkStats } = await supabase
            .from('doc_chunks')
            .select('chunk_id, tokens')
            .eq('doc_id', doc.doc_id);

          const chunk_count = chunkStats?.length || 0;
          const total_tokens = chunkStats?.reduce((sum, chunk) => sum + (chunk.tokens || 0), 0) || 0;

          return {
            ...doc,
            chunk_count,
            total_tokens
          };
        })
      );

      // Get overall statistics
      const { count: totalDocs } = await supabase
        .from('docs')
        .select('*', { count: 'exact', head: true });

      const { count: pendingDocs } = await supabase
        .from('docs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: readyDocs } = await supabase
        .from('docs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ready');

      const { count: errorDocs } = await supabase
        .from('docs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'error');

      const { count: totalChunks } = await supabase
        .from('doc_chunks')
        .select('*', { count: 'exact', head: true });

      return new Response(
        JSON.stringify({
          success: true,
          documents: documentsWithStats,
          statistics: {
            total_documents: totalDocs || 0,
            pending_documents: pendingDocs || 0,
            ready_documents: readyDocs || 0,
            error_documents: errorDocs || 0,
            total_chunks: totalChunks || 0
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE') {
      // Delete a specific document and its chunks
      const url = new URL(req.url);
      const docId = url.pathname.split('/').pop();

      if (!docId) {
        return new Response(
          JSON.stringify({ error: 'Document ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get document info first
      const { data: doc } = await supabase
        .from('docs')
        .select('uri')
        .eq('doc_id', docId)
        .single();

      if (!doc) {
        return new Response(
          JSON.stringify({ error: 'Document not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete chunks first (due to foreign key constraint)
      const { error: chunksError } = await supabase
        .from('doc_chunks')
        .delete()
        .eq('doc_id', docId);

      if (chunksError) {
        console.error('Error deleting chunks:', chunksError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete document chunks' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete document record
      const { error: docError } = await supabase
        .from('docs')
        .delete()
        .eq('doc_id', docId);

      if (docError) {
        console.error('Error deleting document:', docError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete document' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try to delete file from storage if it's not a URL
      if (!doc.uri.startsWith('http')) {
        await supabase.storage
          .from('compliance-raw')
          .remove([doc.uri]);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Document and chunks deleted successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
