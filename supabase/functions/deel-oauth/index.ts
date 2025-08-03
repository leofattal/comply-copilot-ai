/* 
SUPABASE EDGE FUNCTION: deel-oauth
This should replace your current deel-oauth Edge Function
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
    // Get action from query params
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    
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

    if (action === 'authorize') {
      // Get stored Deel credentials with detailed logging
      console.log('Getting credentials for user:', user.id)
      const { data: credentials, error: credError } = await supabaseClient
        .from('deel_credentials')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('Credentials query result:', { credentials, credError })

      if (credError || !credentials) {
        console.error('Credentials error:', credError)
        throw new Error(`Deel credentials not found. Please initialize credentials first. Error: ${credError?.message || 'No credentials'}`)
      }

      // Log the retrieved credentials (without sensitive data)
      console.log('Retrieved authorize_uri:', credentials.authorize_uri)
      console.log('Retrieved client_id:', credentials.client_id)

      // Generate state parameter
      const state = `${user.id}:${Date.now()}`
      
      // Store state in database for verification
      await supabaseClient
        .from('oauth_states')
        .insert({
          user_id: user.id,
          state: state,
          provider: 'deel',
          expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        })

      // CORRECT Deel OAuth URL construction with validation
      if (!credentials.authorize_uri) {
        throw new Error('authorize_uri is missing from credentials')
      }
      
      console.log('Building URL with authorize_uri:', credentials.authorize_uri)
      const authUrl = new URL(credentials.authorize_uri) // Should be: https://app.deel.com/oauth2/authorize
      authUrl.searchParams.set('client_id', credentials.client_id)
      authUrl.searchParams.set('redirect_uri', 'https://comply-copilot-ai.lovable.app/auth/deel/callback')
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('state', state)
      
      // Properly format scopes (space-separated, then URL encoded)
      const scopes = 'employees:read contracts:read payroll:read org:read timesheets:read webhooks:write'
      authUrl.searchParams.set('scope', scopes)
      
      console.log('Final generated URL:', authUrl.toString())

      return new Response(
        JSON.stringify({ 
          success: true, 
          authUrl: authUrl.toString(),
          state: state 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } 
    else if (action === 'callback') {
      // Handle OAuth callback
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      
      if (!code || !state) {
        throw new Error('Missing code or state parameter')
      }

      // Verify state
      const { data: stateRecord, error: stateError } = await supabaseClient
        .from('oauth_states')
        .select('*')
        .eq('state', state)
        .eq('user_id', user.id)
        .single()

      if (stateError || !stateRecord) {
        throw new Error('Invalid state parameter')
      }

      // Get credentials
      const { data: credentials, error: credError } = await supabaseClient
        .from('deel_credentials')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (credError || !credentials) {
        throw new Error('Deel credentials not found')
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://api.sandbox.deel.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: 'https://comply-copilot-ai.lovable.app/auth/deel/callback'
        })
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        throw new Error(`Token exchange failed: ${errorText}`)
      }

      const tokenData = await tokenResponse.json()
      
      // Store access token
      await supabaseClient
        .from('deel_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000))
        })

      // Clean up state
      await supabaseClient
        .from('oauth_states')
        .delete()
        .eq('state', state)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    else if (action === 'token') {
      // Get current access token
      const { data: token, error: tokenError } = await supabaseClient
        .from('deel_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (tokenError || !token) {
        return new Response(
          JSON.stringify({ success: false, error: 'No access token found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          accessToken: token.access_token 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    else {
      throw new Error('Invalid action parameter')
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
