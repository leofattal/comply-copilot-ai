/*
 * DEEL API PROXY EDGE FUNCTION
 * Proxies Deel API calls using Personal Access Token (PAT)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Deel API proxy request received');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('✅ User authenticated:', user.id);

    // Get the endpoint from query parameters
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    
    if (!endpoint) {
      throw new Error('No endpoint specified');
    }

    console.log('📡 Proxying request to endpoint:', endpoint);

    // Get user's PAT token
    console.log('🔑 Fetching user PAT token...');
    const { data: credentials, error: credError } = await supabaseClient
      .from('deel_credentials')
      .select('personal_access_token')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials?.personal_access_token) {
      throw new Error('No Personal Access Token found. Please configure your Deel PAT in settings.');
    }

    console.log('✅ PAT token found, making API call...');

    // Make the API call to Deel using PAT
    const deelBaseUrl = 'https://api-sandbox.demo.deel.com';
    const fullUrl = `${deelBaseUrl}${endpoint}`;
    
    console.log('🌐 Calling:', fullUrl);

    const deelResponse = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${credentials.personal_access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Comply-Copilot-AI/1.0'
      },
      // Forward the request body if it exists
      body: req.method !== 'GET' ? await req.text() : undefined
    });

    if (!deelResponse.ok) {
      const errorText = await deelResponse.text();
      console.error('❌ Deel API error:', deelResponse.status, errorText);
      throw new Error(`Deel API error ${deelResponse.status}: ${errorText}`);
    }

    const responseData = await deelResponse.json();
    console.log('✅ Successfully proxied Deel API call');

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Deel API proxy error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});