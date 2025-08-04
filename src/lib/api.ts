// API utility functions for backend integration
import { supabase } from './supabase';

// Deel API Integration Types
export interface DeelCredentials {
  clientId: string;
  clientSecret: string;
  authorizeUri: string;
  sandboxBaseUrl: string;
  productionBaseUrl: string;
  redirectUri?: string;
}

export interface DeelEmployee {
  id: string;
  name: string;
  email: string;
  job_title: string;
  employment_type: 'employee' | 'contractor';
  status: 'active' | 'inactive' | 'terminated';
  start_date: string;
  country: string;
  department?: string;
  salary?: {
    amount: number;
    currency: string;
    frequency: 'monthly' | 'annually';
  };
  working_hours?: {
    hours_per_week: number;
    schedule_type: 'full_time' | 'part_time';
  };
  compliance_status?: {
    classification_compliant: boolean;
    wage_hour_compliant: boolean;
    benefits_compliant: boolean;
    last_audit_date: string;
  };
}

export interface DeelContract {
  id: string;
  employee_id: string;
  contract_type: 'employment' | 'contractor' | 'eor';
  status: 'active' | 'pending' | 'terminated';
  start_date: string;
  end_date?: string;
  terms: {
    salary_amount: number;
    currency: string;
    payment_frequency: string;
    working_hours: number;
  };
  compliance_requirements: string[];
}

export interface DeelPayrollRecord {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  net_pay: number;
  currency: string;
  deductions: {
    tax: number;
    social_security: number;
    benefits: number;
    other: number;
  };
  overtime?: {
    hours: number;
    rate_multiplier: number;
    total_amount: number;
  };
  compliance_checks: {
    minimum_wage_met: boolean;
    overtime_calculated_correctly: boolean;
    tax_withholding_correct: boolean;
  };
}

export interface DeelComplianceAlert {
  id: string;
  employee_id: string;
  alert_type: 'classification' | 'wage_hour' | 'benefits' | 'tax' | 'regulatory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommended_action: string;
  due_date?: string;
  created_at: string;
  resolved: boolean;
}

export interface ContactFormData {
  name: string;
  email: string;
  company: string;
  employees: string;
  message: string;
}

export interface NewsletterData {
  email: string;
}

export interface DemoRequestData {
  name: string;
  email: string;
  company: string;
  phone?: string;
  preferredDate?: string;
}

// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.complyai.com' 
  : 'http://localhost:3001';

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Contact form submission
export async function submitContactForm(data: ContactFormData): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest<{ success: boolean; message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    console.error('Contact form submission failed:', error);
    throw error;
  }
}

// Newsletter subscription
export async function subscribeNewsletter(data: NewsletterData): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest<{ success: boolean; message: string }>('/api/newsletter', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    console.error('Newsletter subscription failed:', error);
    throw error;
  }
}

// Demo request
export async function requestDemo(data: DemoRequestData): Promise<{ success: boolean; message: string; schedulingLink?: string }> {
  try {
    const response = await apiRequest<{ success: boolean; message: string; schedulingLink?: string }>('/api/demo', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (error) {
    console.error('Demo request failed:', error);
    throw error;
  }
}

// Health check endpoint
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  try {
    const response = await apiRequest<{ status: string; timestamp: string }>('/api/health');
    return response;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
}

// Supabase Edge Function utilities
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://eufsshczsdzfxmlkbpey.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZnNzaGN6c2R6ZnhtbGticGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxODczMjgsImV4cCI6MjA2OTc2MzMyOH0.eM-eiGCKhDOzHcKdnGpefj4hm6mdVDRL7gxkkryyNJc';

let currentUserToken: string | null = null;

export function setUserToken(token: string) {
  currentUserToken = token;
}

async function supabaseEdgeFunction<T>(
  functionName: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentUserToken}`,
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase function call failed: ${errorText}`);
  }

  return response.json();
}

// Deel API Integration Functions

/**
 * Store Deel API credentials securely
 */
export async function storeDeelCredentials(credentials: DeelCredentials): Promise<{ success: boolean; message: string }> {
  try {
    const response = await supabaseEdgeFunction<{ success: boolean; message: string }>('deel-credentials', {
      method: 'POST',
      body: JSON.stringify({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        authorize_uri: credentials.authorizeUri,
        sandbox_base_url: credentials.sandboxBaseUrl,
        production_base_url: credentials.productionBaseUrl
      }),
    });
    return response;
  } catch (error) {
    console.error('Failed to store Deel credentials:', error);
    throw error;
  }
}

/**
 * Get stored Deel credentials (without sensitive data)
 */
export async function getDeelCredentials(): Promise<{ success: boolean; data?: any }> {
  try {
    const response = await supabaseEdgeFunction<{ success: boolean; data: any }>('deel-credentials', {
      method: 'GET',
    });
    return response;
  } catch (error) {
    console.error('Failed to get Deel credentials:', error);
    throw error;
  }
}

/**
 * Initialize Deel OAuth flow
 */
// CSP-friendly local credential storage
const DEEL_CREDENTIALS_KEY = 'deel_credentials';

export function storeDeelCredentialsLocal(credentials: DeelCredentials) {
  localStorage.setItem(DEEL_CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function getDeelCredentialsLocal(): DeelCredentials | null {
  try {
    const stored = localStorage.getItem(DEEL_CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export async function initializeDeelOAuth(): Promise<{ success: boolean; authUrl?: string; state?: string }> {
  try {
    console.log('🚀 Starting OAuth initialization...');
    
    // Get credentials from localStorage (CSP-friendly)
    const credentials = getDeelCredentialsLocal();
    
    if (!credentials) {
      console.error('❌ No credentials found in localStorage');
      throw new Error('Deel credentials not found. Please initialize credentials first.');
    }
    
    console.log('✅ Credentials found');
    
    // Generate state parameter (user ID + timestamp) 
    console.log('🔐 Generating OAuth state...');
    
    let userId = 'anonymous';
    try {
      if (currentUserToken && currentUserToken.includes('.')) {
        const payload = JSON.parse(atob(currentUserToken.split('.')[1]));
        userId = payload.sub || payload.user_id || 'anonymous';
        console.log('✅ User ID extracted');
      }
    } catch (jwtError) {
      console.warn('⚠️ JWT parsing failed, using anonymous');
      userId = 'anonymous';
    }
    const state = `${userId}:${Date.now()}`;
    
    // Store state in sessionStorage for verification
    sessionStorage.setItem('deel_oauth_state', state);
    console.log('✅ State generated and stored');
    
    // Build OAuth URL completely client-side (no API calls) - CORRECT DEEL ENDPOINT
    console.log('🌐 Building OAuth URL...');
    const authUrl = new URL(credentials.authorizeUri || 'https://app.demo.deel.com/oauth2/authorize');
    
    // Environment-aware redirect URI
    const currentOrigin = window.location.origin;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isNgrok = window.location.hostname.includes('.ngrok.io') || window.location.hostname.includes('.ngrok-free.app') || window.location.hostname.includes('.ngrok');
    
    let redirectUri;
    if (currentOrigin.includes('636c85911d89.ngrok-free.app')) {
      // Use specific ngrok URL
      redirectUri = 'https://636c85911d89.ngrok-free.app/auth/deel/callback';
    } else if (isLocalhost) {
      redirectUri = `${currentOrigin}/auth/deel/callback`;  // localhost:8081/auth/deel/callback
    } else if (isNgrok) {
      redirectUri = `${currentOrigin}/auth/deel/callback`;  // https://abc123.ngrok.io/auth/deel/callback
    } else {
      redirectUri = 'https://comply-copilot-ai.lovable.app/auth/deel/callback';  // production
    }
    
    console.log('✅ Redirect URI:', redirectUri);
    
    authUrl.searchParams.set('client_id', credentials.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    // Include proper OAuth 2.0 scopes (space-separated per Deel docs)
    authUrl.searchParams.set('scope', 'contracts:read contracts:write organizations:read');
    
    console.log('✅ OAuth URL generated successfully');
    console.log('🚀 Redirecting to Deel OAuth...');
    
    // Navigate directly - OAuth initialization is working perfectly!
    window.location.href = authUrl.toString();
    
    return {
      success: true,
      authUrl: authUrl.toString(),
      state: state
    };
  } catch (error) {
    console.error('❌ OAUTH INITIALIZATION FAILED:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

/**
 * Get current Deel access token
 */
export async function getDeelAccessToken(): Promise<{ success: boolean; accessToken?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/deel-oauth`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentUserToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'token' })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to get Deel access token:', error);
    throw error;
  }
}

/**
 * Make authenticated Deel API call via Supabase Edge Function (CORS-friendly)
 */
async function deelApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Call the Supabase Edge Function instead of direct API call
  const url = `${SUPABASE_URL}/functions/v1/deel-api?endpoint=${encodeURIComponent(endpoint)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentUserToken}`,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deel API request failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch employees from Deel
 */
export async function getDeelEmployees(): Promise<DeelEmployee[]> {
  try {
    // NEW TOKEN: Try people endpoint first since we now have people:read scope
    console.log('🔄 Trying /rest/v2/people endpoint with new token (people:read scope)...');
    
    try {
      const peopleResponse = await deelApiCall<{ data: any[] }>('/rest/v2/people');
      console.log('✅ Successfully fetched from /rest/v2/people endpoint!');
      
      // Map people data to employee structure
      const peopleData = peopleResponse.data || [];
      const mappedEmployees: DeelEmployee[] = peopleData.map((person: any) => ({
        id: person.id || 'unknown',
        name: person.full_name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown Name',
        email: person.emails?.find((e: any) => e.type === 'work')?.value || 
               person.emails?.find((e: any) => e.type === 'primary')?.value || 
               person.emails?.[0]?.value || 'No email provided',
        job_title: person.job_title || 'Not specified',
        employment_type: person.hiring_type === 'contractor' ? 'contractor' : 'employee',
        status: (person.hiring_status || person.new_hiring_status || 'active') as 'active' | 'inactive' | 'terminated',
        start_date: person.start_date || person.created_at || new Date().toISOString(),
        country: person.country || '',
        department: typeof person.department === 'object' ? person.department?.name : person.department,
        salary: person.employments?.[0]?.payment ? {
          amount: person.employments[0].payment.rate || 0,
          currency: person.employments[0].payment.currency || 'USD',
          frequency: person.employments[0].payment.scale === 'annual' ? 'annually' : 'monthly'
        } : undefined,
        working_hours: {
          hours_per_week: 40, // Default
          schedule_type: person.hiring_type === 'contractor' ? 'part_time' : 'full_time'
        },
        compliance_status: {
          classification_compliant: true, // Default
          wage_hour_compliant: true, // Default
          benefits_compliant: true, // Default
          last_audit_date: new Date().toISOString()
        }
      }));
      
      console.log('✅ Mapped employee data:', mappedEmployees[0]);
      return mappedEmployees;
    } catch (peopleError) {
      console.log('❌ /rest/v2/people failed, trying /rest/v2/workers...');
      
      try {
        const workersResponse = await deelApiCall<{ data: DeelEmployee[] }>('/rest/v2/workers');
        console.log('✅ Successfully fetched from /rest/v2/workers endpoint!');
        return Array.isArray(workersResponse.data) ? workersResponse.data : [];
      } catch (workersError) {
        console.log('❌ /rest/v2/workers failed, using contracts as fallback...');
        
        // Fallback to contracts (confirmed working)
        const response = await deelApiCall<{ data: DeelEmployee[] }>('/rest/v2/contracts');
        
        // Transform contract data to employee-like structure
        const contractData = response.data || [];
        const employeeData: DeelEmployee[] = contractData.map((contract: any) => ({
          id: contract.id || 'unknown',
          name: contract.title || contract.worker_name || contract.name || 'Unknown Employee',
          email: contract.worker_email || contract.email || `worker-${contract.id}@deel.com`,
          job_title: contract.job_title || contract.role || 'Contractor',
          employment_type: contract.type === 'contractor' ? 'contractor' : 'employee',
          status: (contract.status || 'active') as 'active' | 'inactive' | 'terminated',
          start_date: contract.start_date || contract.created_at || new Date().toISOString(),
          country: contract.country || '',
          department: contract.department,
          salary: contract.payment ? {
            amount: contract.payment.rate || 0,
            currency: contract.payment.currency || 'USD',
            frequency: contract.payment.scale === 'annual' ? 'annually' : 'monthly'
          } : undefined,
          working_hours: {
            hours_per_week: 40,
            schedule_type: contract.type === 'contractor' ? 'part_time' : 'full_time'
          },
          compliance_status: {
            classification_compliant: true,
            wage_hour_compliant: true,
            benefits_compliant: true,
            last_audit_date: new Date().toISOString()
          }
        }));
        
        console.log('✅ Using transformed contract data as employee data');
        return employeeData;
      }
    }
  } catch (error) {
    console.error('Failed to fetch Deel employees:', error);
    throw error;
  }
}

/**
 * Fetch contracts from Deel
 */
export async function getDeelContracts(): Promise<DeelContract[]> {
  try {
    // ✅ CONFIRMED WORKING: This endpoint returns 200 OK with sample data
    console.log('✅ Using confirmed working endpoint: /rest/v2/contracts');
    const response = await deelApiCall<{ data: DeelContract[] }>('/rest/v2/contracts');
    return Array.isArray(response.data) ? response.data : []; // Handle different response formats
  } catch (error) {
    console.error('Failed to fetch Deel contracts:', error);
    throw error;
  }
}

/**
 * Fetch payroll records from Deel
 */
export async function getDeelPayrollRecords(employeeId?: string): Promise<DeelPayrollRecord[]> {
  try {
    const endpoint = employeeId 
      ? `/api/v1/payroll/employees/${employeeId}` 
      : '/api/v1/payroll';
    const response = await deelApiCall<{ data: DeelPayrollRecord[] }>(endpoint);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch Deel payroll records:', error);
    throw error;
  }
}

/**
 * Run compliance analysis on employee data (legacy function)
 */
export async function runEmployeeComplianceAnalysis(employeeId: string): Promise<DeelComplianceAlert[]> {
  try {
    // This would typically call your AI compliance engine
    // For now, we'll simulate with a backend API call
    const response = await apiRequest<{ alerts: DeelComplianceAlert[] }>('/api/compliance/analyze', {
      method: 'POST',
      body: JSON.stringify({ employeeId, provider: 'deel' }),
    });
    return response.alerts;
  } catch (error) {
    console.error('Failed to run compliance analysis:', error);
    throw error;
  }
}

/**
 * Setup Deel webhook for real-time updates
 */
export async function setupDeelWebhook(webhookUrl: string, events: string[]): Promise<{ success: boolean; webhookId?: string }> {
  try {
    const response = await deelApiCall<{ id: string }>('/api/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        url: webhookUrl,
        events,
        active: true,
      }),
    });
    
    return { success: true, webhookId: response.id };
  } catch (error) {
    console.error('Failed to setup Deel webhook:', error);
    throw error;
  }
}

// Compliance Analysis Types
export interface ComplianceReport {
  id: string;
  user_id: string;
  organization_name: string;
  report_data: any;
  risk_score: number;
  critical_issues: number;
  total_workers: number;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAnalysisResult {
  success: boolean;
  analysis?: any;
  workersAnalyzed?: number;
  reportId?: string;
  error?: string;
}

/**
 * Fetch the latest compliance report for the current user
 */
export async function getLatestComplianceReport(): Promise<ComplianceReport | null> {
  try {
    console.log('📋 Fetching latest compliance report from database...');
    
    // Get the current session to ensure we're authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('❌ No active session found');
      return null;
    }

    console.log('✅ Found active session, user ID:', session.user.id);
    console.log('🔐 Session details:', {
      access_token: session.access_token ? 'Present' : 'Missing',
      token_type: session.token_type,
      expires_at: session.expires_at
    });

    const { data, error } = await supabase
      .from('compliance_reports')
      .select('*')
      .eq('user_id', session.user.id)  // Explicitly filter by user_id
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        console.log('📋 No compliance reports found in database for user:', session.user.id);
        return null;
      }
      console.error('❌ Database error fetching compliance report:', error);
      throw error;
    }

    console.log('✅ Found compliance report:', { 
      id: data.id, 
      created_at: data.created_at, 
      risk_score: data.risk_score,
      critical_issues: data.critical_issues,
      total_workers: data.total_workers,
      has_report_data: !!data.report_data,
      user_id: data.user_id
    });
    return data;
  } catch (error) {
    console.error('Failed to fetch latest compliance report:', error);
    return null;
  }
}

/**
 * Run a new compliance analysis
 */
export async function runComplianceAnalysis(): Promise<ComplianceAnalysisResult> {
  try {
    console.log('🔄 Starting compliance analysis...');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error: functionError } = await supabase.functions.invoke('compliance-review', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      }
    });

    if (functionError) {
      throw new Error(`Compliance analysis failed: ${functionError.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }

    console.log('✅ Compliance analysis completed:', data);
    return data;

  } catch (error) {
    console.error('❌ Compliance analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    };
  }
}

/**
 * Convert compliance analysis to alert format
 */
export function convertAnalysisToAlerts(analysis: any): DeelComplianceAlert[] {
  if (!analysis || !analysis.violations) {
    return [];
  }

  return analysis.violations.map((violation: any, index: number) => ({
    id: `compliance-${violation.workerId || index}`,
    employee_id: violation.workerId || '',
    alert_type: violation.violationType === 'minimum_wage' ? 'wage_hour' : 
               violation.violationType === 'overtime' ? 'wage_hour' :
               violation.violationType === 'classification' ? 'classification' : 'regulatory',
    severity: violation.severity,
    title: violation.title,
    description: violation.description,
    recommended_action: violation.recommendedActions?.join('; ') || 'Review and address compliance issue',
    created_at: new Date().toISOString(),
    resolved: false
  }));
}

// For development/testing - simulate API calls
export function simulateApiCall<T>(data: T, delay: number = 1000): Promise<{ success: boolean; data: T }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data });
    }, delay);
  });
}