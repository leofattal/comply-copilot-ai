/* 
SIMPLE TEST VERSION - DEBUG OAUTH CALLBACK
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔥 TEST FUNCTION CALLED!')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎯 Processing request...')
    
    // Try to read body
    let body = null
    try {
      body = await req.json()
      console.log('📦 Request body:', body)
    } catch (e) {
      console.log('❌ Failed to parse body:', e.message)
    }
    
    // Check auth header
    const authHeader = req.headers.get('Authorization')
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing')
    
    console.log('✅ Test function completed successfully')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test function worked!',
        receivedBody: body,
        hasAuth: !!authHeader
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Test function error:', error)
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