import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Jurisdiction wage & hour rules (used for baseline checks)
const JURISDICTION_RULES = {
  US: {
    federalMinimumWage: 7.25,
    overtimeThreshold: 40,
    currency: 'USD',
    states: {
      CA: { minimumWage: 16.0, overtimeThreshold: 8 },
      NY: { minimumWage: 15.0, overtimeThreshold: 40 },
      WA: { minimumWage: 16.28, overtimeThreshold: 40 },
      TX: { minimumWage: 7.25, overtimeThreshold: 40 },
      FL: { minimumWage: 12.0, overtimeThreshold: 40 },
    },
  },
  GB: { minimumWage: 10.9, overtimeThreshold: 48, currency: 'GBP' },
  DE: { minimumWage: 12.0, overtimeThreshold: 48, currency: 'EUR' },
  CA: { federalMinimumWage: 16.65, overtimeThreshold: 44, currency: 'CAD' },
};

interface WorkerData {
  id: string;
  name: string;
  email: string;
  classification: string;
  location: { country: string; state: string };
  compensation: { rate: number; currency: string; scale: 'annual'|'monthly'|'hourly' };
  employment: { jobTitle: string; status: string };
}

// ---------------- RAG utilities aligned with rag-query ----------------

type Chunk = { chunk_id: number; doc_id: string; doc_title: string | null; section_path: string | null; content: string; similarity: number };

const approxTokenCount = (text: string): number => Math.ceil(Math.ceil((text || '').length / 4) * 1.2);

const selectContextWithBudget = (chunks: Chunk[], promptText: string, opts?: { maxPerDoc?: number; maxChunks?: number; contextWindowTokens?: number; reasoningReserveRatio?: number }): Chunk[] => {
  const maxPerDoc = opts?.maxPerDoc ?? 2;
  const maxChunks = opts?.maxChunks ?? 12;
  const contextWindowTokens = opts?.contextWindowTokens ?? (Number(Deno.env.get('LLM_CONTEXT_WINDOW_TOKENS')) || 8192);
  const reasoningReserveRatio = opts?.reasoningReserveRatio ?? (Number(Deno.env.get('LLM_REASONING_RESERVE_RATIO')) || 0.3);
  const allowed = Math.max(512, Math.floor(contextWindowTokens * (1 - reasoningReserveRatio)) - approxTokenCount(promptText) - 256);

  const docCounts = new Map<string, number>();
  const diversified: Chunk[] = [];
  for (const c of chunks) {
    const n = docCounts.get(c.doc_id) || 0;
    if (n < maxPerDoc) {
      diversified.push(c);
      docCounts.set(c.doc_id, n + 1);
      if (diversified.length >= maxChunks) break;
    }
  }

  const selected: Chunk[] = [];
  let used = 0;
  for (const c of diversified) {
    const meta = `${c.doc_title ? `Document: ${c.doc_title}` : ''}${c.section_path ? ` | Section: ${c.section_path}` : ''}`;
    const txt = `[${selected.length + 1}] ${meta}\n${c.content}`;
    const cost = approxTokenCount(txt) + 8;
    if (used + cost > allowed) break;
    selected.push(c);
    used += cost;
  }
  return selected;
};

const extractUsedCitationIndices = (answer: string): Set<number> => {
  const indices = new Set<number>();
  const re = /\[([0-9]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    const idx = Number(m[1]);
    if (!Number.isNaN(idx)) indices.add(idx);
  }
  return indices;
};

const dedupeByDocumentPreserveSmallestIndex = (chunksInOrder: Chunk[], originalIndexFromOrder: (i: number) => number, maxDocs: number = 3): Array<{ chunk: Chunk; index: number }> => {
  const bestByDoc = new Map<string, { chunk: Chunk; index: number }>();
  for (let i = 0; i < chunksInOrder.length; i++) {
    const c = chunksInOrder[i];
    const idx = originalIndexFromOrder(i);
    const existing = bestByDoc.get(c.doc_id);
    if (!existing) {
      bestByDoc.set(c.doc_id, { chunk: c, index: idx });
      continue;
    }
    // Prefer higher similarity; tie-breaker smaller index (earlier citation)
    if (c.similarity > existing.chunk.similarity || (c.similarity === existing.chunk.similarity && idx < existing.index)) {
      bestByDoc.set(c.doc_id, { chunk: c, index: idx });
    }
  }
  const arr = Array.from(bestByDoc.values());
  arr.sort((a, b) => b.chunk.similarity - a.chunk.similarity);
  return arr.slice(0, maxDocs);
};

// ---------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Support internal service-to-service invocation to avoid browser CORS/timeout issues
    const internalKey = req.headers.get('x-internal-key');
    const expectedKey = Deno.env.get('RAG_INTERNAL_KEY');

    let userId: string | null = null;
    if (internalKey && expectedKey && internalKey === expectedKey) {
      // Internal call: accept user_id from query or body
      const url = new URL(req.url);
      userId = url.searchParams.get('user_id');
      if (!userId) {
        try { const body = await req.clone().json(); userId = body?.user_id || null; } catch {}
      }
      if (!userId) throw new Error('Missing user_id for internal invocation');
    } else {
      // External call: validate Supabase JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('No authorization header');
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) throw new Error('Unauthorized');
      userId = user.id;
    }

    // Parse body once for optional inputs
    let workers: WorkerData[] = [];
    let ablation = false;
    try { const body = await req.json(); workers = Array.isArray(body?.workers) ? body.workers : []; ablation = Boolean(body?.ablation); } catch {}

    if (workers.length === 0) {
      const { data: credentials } = await supabase
        .from('deel_credentials')
        .select('personal_access_token')
        .eq('user_id', userId!)
        .single();
      if (credentials?.personal_access_token) {
        try {
          workers = await fetchWorkforceData(credentials.personal_access_token);
        } catch (_) {
          // ignore and proceed with empty workers
        }
      }
    }

    // Reconcile counts directly from Deel only if not provided by client
    let employeesCount = workers?.length ?? 0;
    let contractsCount = 0;
    if (!employeesCount) {
      try {
        const { data: credentials } = await supabase
          .from('deel_credentials')
          .select('personal_access_token')
          .eq('user_id', userId!)
          .single();
        if (credentials?.personal_access_token) {
          const counts = await fetchDeelCounts(credentials.personal_access_token);
          contractsCount = counts.contracts ?? 0;
          const peopleCount = counts.employees ?? 0;
          const workersLen = Array.isArray(workers) ? workers.length : 0;
          // Prefer explicit workers length if provided, else people count.
          employeesCount = workersLen || peopleCount || employeesCount;
        }
      } catch (_) {}
    }

    // Ensure workers array is populated; if empty, synthesize a minimal list from Deel contracts as a fallback only
    let analysis = await analyzeWithRAG(supabase, workers, employeesCount);
    let baseline: any | null = null;
    if (ablation) {
      // Run a baseline analysis with no retrieved context to compare
      const systemInstruction = `You are a professional HR-compliance assistant. Use the provided worker list and the built-in jurisdiction rules to assess likely risks. Be decisive; if data is sufficient to infer a violation, report it. If key info is missing, say "insufficient information".`;
      const compact = compactWorkersForPrompt(workers);
      const rules = JSON.stringify(JURISDICTION_RULES);
      const userPrompt = `Baseline compliance review WITHOUT retrieved documents.\n\nJurisdiction Rules (built-in):\n${rules}\n\nWorkers (essential fields, first ${compact.length} of ${workers.length}):\n${JSON.stringify(compact)}\n\nInstructions:\n- Convert rates to hourly (annual/2080, monthly/173.33).\n- For each worker, compare hourly rate to minimum wage for their jurisdiction.\n- Flag violations: { workerId, workerName, violationType: "minimum_wage|overtime|payment_frequency", severity, title, description, jurisdiction, currentRate, requiredRate, recommendedActions[] }.\n- If you suspect overtime or payment frequency issues based on classification and scale, include them with justification.\n- Output strictly JSON with fields: summary, violations[], recommendations[].\n`;
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_API_KEY ?? '' },
        body: JSON.stringify({ systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }, contents: [{ parts: [{ text: userPrompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } })
      });
      if (res.ok) {
        const result = await res.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
        try { const m = text.match(/\{[\s\S]*\}/); if (m) baseline = JSON.parse(m[0]); } catch {}
      }
      // Fallback if model returns nothing
      if (!baseline || typeof baseline !== 'object') {
        const hard = baselineDetections(workers);
        const total = employeesCount || (Array.isArray(workers) ? workers.length : 0) || 0;
        baseline = {
          summary: {
            overallRiskScore: Math.min(100, (hard.length || 0) * 10),
            criticalIssues: hard.length,
            totalWorkers: total,
            complianceRate: total > 0 ? Math.max(0, 100 - (hard.length / total) * 100) : 100
          },
          violations: hard,
          recommendations: []
        };
      }
    }

    // Persist to compliance_reports like the legacy function so UI reload sees sources
    try {
      const summary = (analysis as any)?.summary || {};
      const reportRow = {
        user_id: userId!,
        organization_name: 'Deel Organization',
        report_data: analysis,
        risk_score: summary.overallRiskScore || 0,
        critical_issues: summary.criticalIssues || 0,
        // Store the canonical total workers (prefer Deel counts if available)
        total_workers: Number(employeesCount) > 0 ? employeesCount : (summary.totalWorkers || 0),
        updated_at: new Date().toISOString()
      } as any;
      await supabase
        .from('compliance_reports')
        .upsert(reportRow, { onConflict: 'user_id' });
    } catch (_) {}

    // Compute simple diff counts between RAG and baseline when available
    let diff = null as null | { only_in_rag: number; only_in_baseline: number };
    if (baseline && analysis && Array.isArray((analysis as any).violations)) {
      const ragKeys = new Set(((analysis as any).violations || []).map((v: any) => `${v.workerId || ''}|${v.violationType || ''}`));
      const baseKeys = new Set(((baseline as any).violations || []).map((v: any) => `${v.workerId || ''}|${v.violationType || ''}`));
      let onlyRag = 0, onlyBase = 0;
      ragKeys.forEach(k => { if (!baseKeys.has(k)) onlyRag++; });
      baseKeys.forEach(k => { if (!ragKeys.has(k)) onlyBase++; });
      diff = { only_in_rag: onlyRag, only_in_baseline: onlyBase };
    }

    return new Response(JSON.stringify({ success: true, usedRAG: true, analysis, baseline, diff, workersAnalyzed: analysis?.summary?.totalWorkers ?? employeesCount, meta: { employeesCount, contractsCount }, ablation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, usedRAG: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function fetchWorkforceData(patToken: string): Promise<WorkerData[]> {
  const baseUrl = 'https://api-sandbox.demo.deel.com';
  const limit = 150;
  let offset = 0;
  const results: WorkerData[] = [];
  while (true) {
    const res = await fetch(`${baseUrl}/rest/v2/people?limit=${limit}&offset=${offset}`, {
      headers: { 'Authorization': `Bearer ${patToken}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) break;
    const page = await res.json();
    const items = Array.isArray(page?.data) ? page.data : (Array.isArray(page) ? page : []);
    for (const person of items) {
      const primaryEmployment = person.employments?.[0];
      if (!primaryEmployment) continue;
      results.push({
        id: person.id,
        name: person.full_name,
        email: person.emails?.find((e: any) => e.type === 'work')?.value || '',
        classification: person.hiring_type || 'unknown',
        location: { country: person.country || '', state: person.state || '' },
        compensation: {
          rate: primaryEmployment.payment?.rate || 0,
          currency: primaryEmployment.payment?.currency || 'USD',
          scale: primaryEmployment.payment?.scale || 'annual'
        },
        employment: { jobTitle: person.job_title || '', status: person.hiring_status || '' }
      });
    }
    if (items.length < limit) break;
    offset += items.length;
    if (offset > 10000) break;
  }
  return results;
}

async function fetchDeelCounts(patToken: string): Promise<{ employees: number; contracts: number }> {
  const baseUrl = 'https://api-sandbox.demo.deel.com';
  // Use offset-based pagination for accurate counts
  const LIMIT = 150;
  let employees = 0;
  try {
    let offset = 0;
    while (true) {
      const peopleRes = await fetch(`${baseUrl}/rest/v2/people?limit=${LIMIT}&offset=${offset}`, { headers: { 'Authorization': `Bearer ${patToken}`, 'Content-Type': 'application/json' } });
      if (!peopleRes.ok) break;
      const page = await peopleRes.json();
      const items = Array.isArray(page?.data) ? page.data : (Array.isArray(page) ? page : []);
      employees += items.length;
      if (items.length < LIMIT) break;
      offset += items.length;
      if (offset > 10000) break; // safety cap
    }
  } catch (_) {}
  let contracts = 0;
  try {
    let offset = 0;
    while (true) {
      const contractsRes = await fetch(`${baseUrl}/rest/v2/contracts?limit=${LIMIT}&offset=${offset}`, { headers: { 'Authorization': `Bearer ${patToken}`, 'Content-Type': 'application/json' } });
      if (!contractsRes.ok) break;
      const page = await contractsRes.json();
      const items = Array.isArray(page?.data) ? page.data : (Array.isArray(page) ? page : []);
      contracts += items.length;
      if (items.length < LIMIT) break;
      offset += items.length;
      if (offset > 10000) break; // safety cap
    }
  } catch (_) {}
  return { employees, contracts };
}

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? '' },
    body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] }, taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 })
  });
  if (!res.ok) throw new Error(`Embedding error: ${res.status}`);
  const data = await res.json();
  const values: number[] = data.embedding?.values ?? [];
  const norm = Math.sqrt(values.reduce((s, v) => s + v*v, 0));
  return values.map(v => v/(norm || 1));
}

async function retrieveContext(supabase: ReturnType<typeof createClient>, query: string, k = 16, threshold = 0.2) {
  const embedding = await generateQueryEmbedding(query);
  const { data, error } = await (supabase as any).rpc('match_chunks', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: k
  });
  if (error) return [] as any[];
  return (data || []) as Array<{ chunk_id: number; doc_id: string; doc_title: string|null; section_path: string|null; content: string; similarity: number }>; 
}

function estimateHourlyRate(worker: WorkerData): number {
  const rate = Number(worker?.compensation?.rate) || 0;
  const scale = worker?.compensation?.scale || 'annual';
  if (scale === 'hourly') return rate;
  if (scale === 'monthly') return rate / 173.33; // ~2080/12
  return rate / 2080; // annual
}

function lookupMinimumWage(country: string, state?: string): number | null {
  if (country === 'US') {
    const states: Record<string, { minimumWage: number }> = (JURISDICTION_RULES as any).US?.states || {};
    if (state && states[state]?.minimumWage) return states[state].minimumWage;
    return (JURISDICTION_RULES as any).US?.federalMinimumWage ?? null;
  }
  const rule = (JURISDICTION_RULES as any)[country];
  if (rule?.minimumWage) return rule.minimumWage;
  return null;
}

function baselineDetections(workers: WorkerData[]) {
  const violations: any[] = [];
  for (const w of workers) {
    const country = w.location?.country || 'US';
    const state = w.location?.state || undefined;
    const minWage = lookupMinimumWage(country, state);
    const hourly = estimateHourlyRate(w);
    if (minWage != null && hourly > 0 && hourly < minWage) {
      violations.push({
        workerId: w.id,
        workerName: w.name,
        violationType: 'minimum_wage',
        severity: 'high',
        title: 'Below minimum wage',
        description: `Estimated hourly rate ${hourly.toFixed(2)} is below required minimum ${minWage.toFixed(2)} in ${country}${state ? '/' + state : ''}.`,
        jurisdiction: state ? `${country}-${state}` : country,
        currentRate: Number(hourly.toFixed(2)),
        requiredRate: Number(minWage.toFixed(2)),
        recommendedActions: ['Adjust compensation to meet or exceed minimum wage']
      });
    }
  }
  return violations;
}

function extractReadableSnippet(text: string): string {
  try {
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    // Prefer the first paragraph-like chunk between 120 and 500 chars
    const parts = (text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    for (const p of parts) {
      if (p.length >= 120 && p.length <= 500) return p;
    }
    // Fallback: first sentence or first 300 chars
    const sentence = cleaned.split(/(?<=[.!?])\s/)[0] || cleaned;
    return sentence.slice(0, 300);
  } catch {
    return '';
  }
}

function compactWorkersForPrompt(workers: WorkerData[], maxItems = 200): Array<any> {
  const essentials = workers.slice(0, maxItems).map(w => ({
    id: w.id,
    name: w.name,
    country: w.location?.country,
    state: w.location?.state,
    rate: w.compensation?.rate,
    scale: w.compensation?.scale,
    classification: w.classification
  }));
  return essentials;
}

async function analyzeWithRAG(supabase: ReturnType<typeof createClient>, workers: WorkerData[], expectedTotalWorkers?: number) {
  if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');

  const countries = Array.from(new Set(workers.map(w => w.location?.country).filter(Boolean)));
  const states = Array.from(new Set(workers.map(w => w.location?.state).filter(Boolean)));
  const retrievalQuery = `FLSA minimum wage & overtime guidance; DOL resources. Countries: ${countries.join(', ')}. States: ${states.join(', ')}`;

  // Retrieve and select a budgeted/diverse subset for prompt
  const chunks = await retrieveContext(supabase, retrievalQuery, 16, 0.2);
  const promptContext = selectContextWithBudget(chunks, retrievalQuery);

  // Build ordered context block
  const contextBlock = promptContext.map((c, i) => `[${i+1}] ${c.doc_title ?? 'Doc'}${c.section_path ? ` — ${c.section_path}` : ''}\n${c.content}`).join('\n\n');

  const systemInstruction = `You are a professional HR-compliance assistant. Use your general knowledge plus the CONTEXT snippets. Write concise findings in your own words. Cite sections when relying on CONTEXT using [n]. If CONTEXT conflicts with settled law you know, explain the conflict. If key info is missing from both your background knowledge and the CONTEXT, answer "insufficient information". Use context to support reasoning; do not quote long passages or cite every sentence.`;

  // Use compact workers payload to stay within token budget
  const compact = compactWorkersForPrompt(workers);
  const userPrompt = `You are a compliance assistant. Prefer citing the Context for legal references. If the Context lacks coverage, you may still flag obvious rule breaches using the provided worker data and general rules summary, and mark them without citations. Provide JSON with summary, violations[], and recommendations[]. Cite using [n] that maps to Context when possible.

Instructions for detection:
- Convert rates to hourly (annual/2080, monthly/173.33).
- Compare hourly rate to the minimum wage for the jurisdiction (use CONTEXT when cited; otherwise use your general knowledge).
- For each violation include: workerId, workerName, violationType, severity, title, description, jurisdiction, currentRate, requiredRate, recommendedActions[].

Context:\n${contextBlock}\n---\nWorkers (essential fields, first ${compact.length} of ${workers.length}):\n${JSON.stringify(compact)}\n`;

  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_API_KEY ?? '' },
    body: JSON.stringify({ systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }, contents: [{ parts: [{ text: userPrompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 2048 } })
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const result = await res.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  let parsed: any = {};
  try { const m = text.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {}

  // Normalize structure to what UI expects
  const summary = typeof parsed.summary === 'object' && parsed.summary !== null ? parsed.summary : {};
  const modelViolations: any[] = Array.isArray(parsed.violations) ? parsed.violations : [];
  const ragViolations = modelViolations.filter(v => v && (v.title || v.description || v.violationType));

  const totalWorkers = (typeof expectedTotalWorkers === 'number' && expectedTotalWorkers > 0)
    ? expectedTotalWorkers
    : (Number(summary.totalWorkers) || (workers?.length ?? 0));
  const criticalIssues = Number(summary.criticalIssues) || ragViolations.filter(v => (v.severity || '').toLowerCase() === 'critical' || (v.severity || '').toLowerCase() === 'high').length;
  const overallRiskScore = Number(summary.overallRiskScore) || Math.min(100, criticalIssues * 10);
  const complianceRate = Number(summary.complianceRate) || (totalWorkers > 0 ? Math.max(0, 100 - (ragViolations.length / totalWorkers) * 100) : 100);

  const normalized = {
    summary: { overallRiskScore, criticalIssues, totalWorkers, complianceRate },
    violations: ragViolations,
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
  };

  // Determine which citations were used anywhere in the JSON text
  const usedIndices = extractUsedCitationIndices(JSON.stringify(parsed));
  if (usedIndices.size === 0) {
    return { ...normalized, sources: [] };
  }
  const usedChunks = promptContext.filter((_, idx) => usedIndices.has(idx + 1));
  const deduped = dedupeByDocumentPreserveSmallestIndex(usedChunks, (i) => i + 1, 3);

  return { 
    ...normalized, 
    sources: deduped.map(({ chunk, index }) => ({ 
      index, 
      doc_id: chunk.doc_id, 
      title: chunk.doc_title, 
      section_path: chunk.section_path, 
      similarity: chunk.similarity,
      snippet: extractReadableSnippet(chunk.content)
    })) 
  };
}


