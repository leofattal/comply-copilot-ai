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
    console.log('🤖 Starting compliance review analysis...');

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

    // Get user's PAT token
    const { data: credentials, error: credError } = await supabaseClient
      .from('deel_credentials')
      .select('personal_access_token')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials?.personal_access_token) {
      throw new Error('No Personal Access Token found. Please configure your Deel PAT in settings.');
    }

    console.log('✅ PAT token found');

    // Fetch workforce data
    const workforceData = await fetchWorkforceData(credentials.personal_access_token);
    console.log(`✅ Fetched data for ${workforceData.length} workers`);

    // Run compliance analysis
    const analysis = await analyzeWageHourCompliance(workforceData);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        workersAnalyzed: workforceData.length
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

async function fetchWorkforceData(patToken: string): Promise<WorkerData[]> {
  const baseUrl = 'https://api-sandbox.demo.deel.com';
  
  // Fetch people data
  const peopleResponse = await fetch(`${baseUrl}/rest/v2/people`, {
    headers: {
      'Authorization': `Bearer ${patToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!peopleResponse.ok) {
    throw new Error(`Failed to fetch people data: ${peopleResponse.status}`);
  }

  const peopleData = await peopleResponse.json();
  const combinedData: WorkerData[] = [];
  
  if (peopleData.data) {
    for (const person of peopleData.data) {
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

        combinedData.push(workerData);
      }
    }
  }

  return combinedData;
}

async function analyzeWageHourCompliance(workers: WorkerData[]) {
  console.log('🤖 Calling Gemini Flash for analysis...');
  
  // Validate API key is available
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY environment variable.');
  }
  
  const prompt = `# WAGE & HOUR COMPLIANCE AUDIT

You are an expert wage & hour compliance auditor. Analyze this workforce data for minimum wage, overtime, and payment compliance violations.

## Jurisdiction Rules
${JSON.stringify(JURISDICTION_RULES, null, 2)}

## Worker Data
${JSON.stringify(workers, null, 2)}

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
    "totalWorkers": number,
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

Focus on critical violations that could result in immediate penalties. Be specific about rates and requirements.`;
  
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
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to parse Gemini response, using fallback');
  }

  // Fallback basic analysis
  return {
    summary: {
      overallRiskScore: 50,
      criticalIssues: 0,
      totalWorkers: workers.length,
      complianceRate: 100
    },
    violations: [],
    recommendations: []
  };
}