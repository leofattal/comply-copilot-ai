/* 
SUPABASE EDGE FUNCTION: deel-credentials
This handles storing/retrieving Deel credentials securely
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    if (req.method === 'POST') {
      // Store credentials
      const credentials = await req.json()
      
      const { error } = await supabaseClient
        .from('deel_credentials')
        .upsert({
          user_id: user.id,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          authorize_uri: credentials.authorize_uri,
          sandbox_base_url: credentials.sandbox_base_url,
          production_base_url: credentials.production_base_url,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(`Failed to store credentials: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Credentials stored successfully' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    else if (req.method === 'GET') {
      // Get credentials (without sensitive data)
      const { data, error } = await supabaseClient
        .from('deel_credentials')
        .select('client_id, authorize_uri, sandbox_base_url, production_base_url, created_at')
        .eq('user_id', user.id)
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No credentials found' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: data 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    else {
      throw new Error('Method not allowed')
    }

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
