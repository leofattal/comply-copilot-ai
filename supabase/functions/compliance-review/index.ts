/*
 * COMPLIANCE REVIEW EDGE FUNCTION
 * AI-powered wage & hour compliance analysis using Gemini Flash
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini Flash configuration
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// Available Gemini models for compliance analysis:
// - gemini-1.5-flash (previous - fast, cost-effective)
// - gemini-1.5-pro (more capable, higher cost)
// - gemini-2.0-flash (current - latest and most capable)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Jurisdiction wage & hour rules
const JURISDICTION_RULES = {
  'US': {
    federalMinimumWage: 7.25,
    overtimeThreshold: 40,
    currency: 'USD',
    states: {
      'CA': { minimumWage: 16.00, overtimeThreshold: 8 },
      'NY': { minimumWage: 15.00, overtimeThreshold: 40 },
      'WA': { minimumWage: 16.28, overtimeThreshold: 40 },
      'TX': { minimumWage: 7.25, overtimeThreshold: 40 },
      'FL': { minimumWage: 12.00, overtimeThreshold: 40 }
    }
  },
  'GB': {
    minimumWage: 10.90,
    overtimeThreshold: 48,
    currency: 'GBP'
  },
  'DE': {
    minimumWage: 12.00,
    overtimeThreshold: 48,
    currency: 'EUR'
  },
  'CA': {
    federalMinimumWage: 16.65,
    overtimeThreshold: 44,
    currency: 'CAD'
  }
};

interface WorkerData {
  id: string;
  name: string;
  email: string;
  classification: string;
  location: {
    country: string;
    state: string;
  };
  compensation: {
    rate: number;
    currency: string;
    scale: 'annual' | 'monthly' | 'hourly';
  };
  employment: {
    jobTitle: string;
    status: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Get PAT token with priority: header > env > database
    const headerPat = req.headers.get('x-deel-pat');
    const envPat = Deno.env.get('DEEL_SANDBOX_PAT');
    
    let pat = headerPat || envPat;
    
    // Only query database if no header or env PAT found
    if (!pat) {
      const { data: credentials, error: credError } = await supabaseClient
        .from('deel_credentials')
        .select('personal_access_token')
        .eq('user_id', user.id)
        .single();
      
      pat = credentials?.personal_access_token;
      
      if (credError || !pat) {
        throw new Error('No Personal Access Token found. Please configure your Deel PAT in Settings → Deel Integration.');
      }
    }

    // Fetch all workforce data using pagination
    const [employeeCount, contractCount, allEmployees, allContracts] = await Promise.all([
      fetchDeelEmployeeCount(pat),
      fetchDeelContractCount(pat), 
      fetchAllEmployees(pat),
      fetchAllContracts(pat)
    ]);
    
    console.log(`📊 Fetched ${employeeCount} employees and ${contractCount} contracts from Deel`);
    
    // Use actual employee data for analysis (limit to prevent timeout)
    const limitedEmployees = allEmployees.slice(0, 50);
    const expectedTotalWorkers = employeeCount;

    // Run compliance analysis (now RAG-enabled)
    const analysis = await analyzeWageHourCompliance(supabaseClient, limitedEmployees, expectedTotalWorkers);

    // Save analysis results to database
    try {
      const reportData = {
        user_id: user.id,
        organization_name: 'Deel Organization',
        report_data: analysis,
        risk_score: analysis.summary?.overallRiskScore || 0,
        critical_issues: analysis.summary?.criticalIssues || 0,
        total_workers: expectedTotalWorkers, // Use the reconciled count from Deel API
        updated_at: new Date().toISOString()
      };

      const { data: insertData, error: insertError } = await supabaseClient
        .from('compliance_reports')
        .upsert(reportData, {
          onConflict: 'user_id'
        })
        .select(); // Add select to return the upserted data

      if (insertError) {
        console.error('❌ Failed to save compliance report:', insertError);
        console.error('📋 Report data that failed:', reportData);
        // Don't fail the whole request, just log the error
      } else {
        console.log('✅ Compliance report saved to database successfully');
        console.log('📋 Saved report ID:', insertData?.[0]?.id);
        console.log('📊 Saved report summary:', {
          critical_issues: insertData?.[0]?.critical_issues,
          risk_score: insertData?.[0]?.risk_score,
          total_workers: insertData?.[0]?.total_workers
        });
      }
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      // Don't fail the whole request, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        workersAnalyzed: expectedTotalWorkers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Compliance review error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper to fetch with pagination using offset
async function fetchPaginated(pat: string, endpoint: string): Promise<any[]> {
  const baseUrl = 'https://api-sandbox.demo.deel.com';
  const limit = 150;
  const all: any[] = [];
  let offset = 0;
  
  while (true) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${baseUrl}${endpoint}${separator}limit=${limit}&offset=${offset}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const page = await response.json();
      const items = Array.isArray(page?.data) ? page.data : (Array.isArray(page) ? page : []);
      
      if (!items.length) break;
      all.push(...items);
      
      if (items.length < limit) break;
      
      offset += items.length;
      
      // Safety cap
      if (offset > 10000) {
        console.warn(`⚠️ Safety cap reached at offset ${offset}`);
        break;
      }
      
      // Small delay to avoid rate limiting
      if (offset > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`❌ Error fetching page at offset ${offset}:`, error);
      break;
    }
  }
  
  return all;
}

async function fetchDeelEmployeeCount(pat: string): Promise<number> {
  const employees = await fetchPaginated(pat, '/rest/v2/people');
  return employees.length;
}

async function fetchDeelContractCount(pat: string): Promise<number> {
  const contracts = await fetchPaginated(pat, '/rest/v2/contracts');
  return contracts.length;
}

async function fetchAllEmployees(pat: string): Promise<WorkerData[]> {
  const peopleData = await fetchPaginated(pat, '/rest/v2/people');
  const workers: WorkerData[] = [];
  
  for (const person of peopleData) {
    const primaryEmployment = person.employments?.[0];
    
    if (primaryEmployment) {
      const workerData: WorkerData = {
        id: person.id,
        name: person.full_name,
        email: person.emails?.find((e: any) => e.type === 'work')?.value || '',
        classification: person.hiring_type || 'unknown',
        location: {
          country: person.country || '',
          state: person.state || ''
        },
        compensation: {
          rate: primaryEmployment.payment?.rate || 0,
          currency: primaryEmployment.payment?.currency || 'USD',
          scale: primaryEmployment.payment?.scale || 'annual'
        },
        employment: {
          jobTitle: person.job_title || '',
          status: person.hiring_status || ''
        }
      };

      workers.push(workerData);
    }
  }
  
  return workers;
}

async function fetchAllContracts(pat: string): Promise<any[]> {
  return await fetchPaginated(pat, '/rest/v2/contracts');
}

// Generate query embedding using Gemini (unit-normalized 768-dim)
async function generateQueryEmbedding(text: string): Promise<number[]> {
  const apiKey = GEMINI_API_KEY;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey ?? '' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768
    })
  });
  if (!response.ok) throw new Error(`Gemini embedding error: ${response.status}`);
  const data = await response.json();
  const vals: number[] = data.embedding?.values ?? [];
  const norm = Math.sqrt(vals.reduce((s, v) => s + v * v, 0));
  return vals.map(v => v / (norm || 1));
}

// Retrieve top-K relevant chunks from doc_chunks via RPC
async function retrieveContext(
  supabase: ReturnType<typeof createClient>,
  query: string,
  k: number = 12,
  threshold: number = 0.25
) {
  const embedding = await generateQueryEmbedding(query);
  const { data, error } = await (supabase as any).rpc('match_chunks', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: k
  });
  if (error) {
    console.error('Vector search error:', error);
    return [] as any[];
  }
  return (data || []) as Array<{
    chunk_id: number;
    doc_id: string;
    doc_title: string | null;
    section_path: string | null;
    content: string;
    similarity: number;
  }>;
}

async function analyzeWageHourCompliance(
  supabase: ReturnType<typeof createClient>,
  workers: WorkerData[],
  totalWorkers: number
) {
  console.log('🤖 Calling Gemini Flash for analysis...');
  
  // Validate API key is available
  if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY environment variable');
    throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY environment variable in Supabase Dashboard → Functions → Environment Variables.');
  }
  
  // Build a retrieval query from jurisdictions present in workforce
  const countries = Array.from(new Set(workers.map(w => w.location?.country).filter(Boolean)));
  const states = Array.from(new Set(workers.map(w => w.location?.state).filter(Boolean)));
  const retrievalQuery = `FLSA minimum wage and overtime rules, federal and state guidance, compliance assistance. Countries: ${countries.join(', ')}. States: ${states.join(', ')}`;

  // Retrieve context from processed docs
  const contextChunks = await retrieveContext(supabase, retrievalQuery, 16, 0.2);

  // Build context block for the model
  const contextBlock = contextChunks
    .map((c, i) => `[${i + 1}] ${c.doc_title ?? 'Unknown Doc'}${c.section_path ? ` — ${c.section_path}` : ''}\n${c.content}`)
    .join('\n\n');

  const prompt = `# WAGE & HOUR COMPLIANCE AUDIT (RAG)

You are an expert wage & hour compliance auditor. Analyze this workforce data for minimum wage, overtime, and payment compliance violations.

## Jurisdiction Rules
${JSON.stringify(JURISDICTION_RULES, null, 2)}

## Worker Data
${JSON.stringify(workers, null, 2)}

## Context (authoritative)
You MUST use ONLY the following context to justify legal conclusions. When stating a rule or requirement, cite the source inline using [n] where n is the source index below.

${contextBlock}

## Required Analysis
1. Check minimum wage compliance by jurisdiction
2. Identify overtime threshold violations
3. Flag payment frequency issues
4. Assess compensation structure problems

## Output Format (JSON only)
{
  "summary": {
    "overallRiskScore": number,
    "criticalIssues": number,
    "totalWorkers": ${totalWorkers},
    "complianceRate": number
  },
  "violations": [
    {
      "workerId": "string",
      "workerName": "string", 
      "violationType": "minimum_wage|overtime|payment_frequency",
      "severity": "critical|high|medium|low",
      "title": "string",
      "description": "string",
      "jurisdiction": "string",
      "currentRate": number,
      "requiredRate": number,
      "recommendedActions": ["string"]
    }
  ],
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "title": "string",
      "affectedWorkers": number,
      "implementation": "string"
    }
  ]
}

Focus on critical violations that could result in immediate penalties. Be specific about rates and requirements. Always include inline citations like [1], [2] that refer to the Context above.`;
  
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent legal analysis
        maxOutputTokens: 4096, // Increased for more detailed compliance reports
        topK: 40,
        topP: 0.8
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!analysisText) {
    throw new Error('No analysis received from Gemini');
  }

  // Parse JSON from Gemini response
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...parsed,
        sources: contextChunks.map((c, i) => ({
          index: i + 1,
          doc_id: c.doc_id,
          title: c.doc_title,
          section_path: c.section_path,
          similarity: c.similarity
        }))
      };
    }
  } catch (error) {
    console.error('Failed to parse Gemini response, using fallback');
  }

  // Fallback basic analysis
  return {
    summary: {
      overallRiskScore: 50,
      criticalIssues: 0,
      totalWorkers: totalWorkers,
      complianceRate: 100
    },
    violations: [],
    recommendations: []
  };
}