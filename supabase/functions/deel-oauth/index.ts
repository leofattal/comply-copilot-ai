/* 
SIMPLIFIED DEEL OAUTH - Based on working test function pattern
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 Deel OAuth Function started - Method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎯 Processing OAuth request...')
    
    // Parse request body
    let body = null
    try {
      body = await req.json()
      console.log('📦 Request body parsed:', Object.keys(body))
    } catch (e) {
      throw new Error(`Failed to parse request body: ${e.message}`)
    }

    const { action, code, state } = body

    console.log('🎯 Action:', action)
    console.log('🔐 Code present:', !!code)
    console.log('🔑 State present:', !!state)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user ID from auth header (simplified approach)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔐 Token present:', !!token)

    // Get user directly from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ User auth error:', userError)
      throw new Error(`User authentication failed: ${userError?.message || 'No user found'}`)
    }

    console.log('✅ User authenticated:', user.id)

    if (action === 'callback') {
      console.log('🔄 Processing OAuth callback...')
      
      if (!code || !state) {
        throw new Error('Missing code or state parameter')
      }

      // Get credentials - simplified query
      console.log('📋 Fetching Deel credentials...')
      const { data: credentials, error: credError } = await supabaseClient
        .from('deel_credentials')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (credError || !credentials) {
        console.error('❌ Credentials error:', credError)
        throw new Error('Deel credentials not found. Please configure them first.')
      }

      console.log('✅ Credentials found for client:', credentials.client_id)

      // Exchange code for access token
      console.log('🔄 Exchanging code for tokens...')
      const tokenResponse = await fetch('https://app.demo.deel.com/oauth2/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: credentials.redirect_uri || 'https://636c85911d89.ngrok-free.app/auth/deel/callback'
        })
      })

      console.log('📡 Token response status:', tokenResponse.status)
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('❌ Token exchange error:', errorText)
        throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorText}`)
      }

      const tokenData = await tokenResponse.json()
      console.log('✅ Token data received:', Object.keys(tokenData))

      if (!tokenData.access_token) {
        throw new Error('No access_token in response from Deel')
      }

      // Store tokens in database
      console.log('💾 Storing tokens in database...')
      const { error: tokenError } = await supabaseClient
        .from('deel_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'  // Resolve conflicts using user_id unique constraint
        })
      
      if (tokenError) {
        console.error('❌ Token storage error:', tokenError)
        throw new Error(`Failed to store tokens: ${tokenError.message}`)
      }

      console.log('✅ Tokens stored successfully!')

      // Clean up OAuth state (optional - don't fail if this errors)
      try {
        await supabaseClient
          .from('oauth_states')
          .delete()
          .eq('state', state)
        console.log('✅ OAuth state cleaned up')
      } catch (stateError) {
        console.log('⚠️ State cleanup failed (non-critical):', stateError)
      }

      console.log('🎉 OAuth callback completed successfully!')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OAuth callback processed successfully',
          hasTokens: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    else if (action === 'token') {
      // Get stored access token
      console.log('🔍 Fetching stored tokens...')
      const { data: token, error: tokenError } = await supabaseClient
        .from('deel_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (tokenError || !token) {
        console.log('❌ No tokens found')
        return new Response(
          JSON.stringify({ success: false, error: 'No access token found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ Tokens found')
      return new Response(
        JSON.stringify({
          success: true,
          accessToken: token.access_token
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    else {
      throw new Error(`Invalid action: ${action}`)
    }

  } catch (error) {
    console.error('❌ OAuth function error:', error)
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