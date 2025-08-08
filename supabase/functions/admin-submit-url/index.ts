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
        Insert: {
          doc_id?: string;
          uri: string;
          title?: string | null;
          uploaded_by?: string | null;
          status?: 'pending' | 'ready' | 'error';
          error_message?: string | null;
        };
      };
    };
  };
}

const isAdmin = async (supabase: any, userId: string): Promise<boolean> => {
  // For now, any authenticated user is considered admin
  return !!userId;
};

const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const fetchAndStoreContent = async (url: string, supabase: any): Promise<string> => {
  try {
    // Fetch content from URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ComplyCompliance-Bot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Only allow HTML and plain text content
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new Error('URL must contain HTML or plain text content');
    }

    const content = await response.text();
    
    if (!content || content.length === 0) {
      throw new Error('URL returned empty content');
    }

    // Generate unique filename for the content
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '-');
    const fileName = `${timestamp}-${hostname}.html`;
    const filePath = `url-content/${fileName}`;

    // Store content in storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-raw')
      .upload(filePath, content, {
        contentType: 'text/html',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to store content: ${uploadError.message}`);
    }

    return filePath;

  } catch (error) {
    console.error('Error fetching and storing URL content:', error);
    throw error;
  }
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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { url, title, description } = body;

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!title || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if URL already exists
    const { data: existingDoc } = await supabase
      .from('docs')
      .select('doc_id, title, status')
      .eq('uri', url)
      .single();

    if (existingDoc) {
      return new Response(
        JSON.stringify({ 
          error: 'URL already exists',
          existing_document: existingDoc
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let storedPath = '';
    
    try {
      // Fetch and store content
      storedPath = await fetchAndStoreContent(url, supabase);
    } catch (fetchError) {
      // If fetching fails, still create the document record with error status
      const { data: docData, error: docError } = await supabase
        .from('docs')
        .insert({
          uri: url,
          title: title.trim(),
          uploaded_by: user.id,
          status: 'error',
          error_message: `Failed to fetch content: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
        })
        .select()
        .single();

      if (docError) {
        console.error('Database insert error:', docError);
        return new Response(
          JSON.stringify({ error: 'Failed to create document record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          document: docData,
          error: `Failed to fetch content from URL: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert document record with content stored
    const { data: docData, error: docError } = await supabase
      .from('docs')
      .insert({
        uri: url, // Keep original URL as the URI
        title: title.trim(),
        uploaded_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (docError) {
      console.error('Database insert error:', docError);
      
      // Clean up stored content
      if (storedPath) {
        await supabase.storage
          .from('compliance-raw')
          .remove([storedPath]);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to create document record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger ingestion pipeline (this would normally be a background job)
    console.log(`URL submitted successfully: ${url}, Document ID: ${docData.doc_id}, Content stored at: ${storedPath}`);

    return new Response(
      JSON.stringify({
        success: true,
        document: docData,
        message: 'URL submitted successfully and content queued for processing',
        stored_path: storedPath
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
