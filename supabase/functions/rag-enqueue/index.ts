import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const internalKey = Deno.env.get('RAG_INTERNAL_KEY');
    if (!internalKey) throw new Error('RAG internal key not configured');

    // Read optional ablation flag from body
    let ablation = false;
    try { const body = await req.json(); ablation = Boolean(body?.ablation); } catch {}

    const targetUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/rag-compliance-review?user_id=${encodeURIComponent(user.id)}`;

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'x-internal-key': internalKey,
        'Content-Type': 'application/json',
        // Forward the user's JWT to satisfy verify_jwt on the target function
        'Authorization': authHeader
      },
      body: JSON.stringify({ trigger: 'enqueue', user_id: user.id, ablation })
    });

    const text = await resp.text();

    if (!resp.ok) {
      console.error('rag-enqueue forwarding error', { status: resp.status, text: text?.slice(0, 500) });
      return new Response(JSON.stringify({ success: false, status: resp.status, error: text }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Proxy the JSON result from rag-compliance-review
    let payload: any = {};
    try { payload = JSON.parse(text); } catch { payload = { proxied: text }; }

    return new Response(JSON.stringify({ success: true, ...payload }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


