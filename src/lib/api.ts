// API utility functions for backend integration

// Deel API Integration Types
export interface DeelCredentials {
  clientId: string;
  clientSecret: string;
  authorizeUri: string;
  sandboxBaseUrl: string;
  productionBaseUrl: string;
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
export async function initializeDeelOAuth(): Promise<{ success: boolean; authUrl?: string; state?: string }> {
  try {
    // Make single API call with action parameter
    const url = new URL(`${SUPABASE_URL}/functions/v1/deel-oauth`);
    url.searchParams.set('action', 'authorize');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${currentUserToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth initialization failed: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Instead of opening popup, navigate to the URL directly to bypass CSP
    if (result.success && result.authUrl) {
      // Store state in sessionStorage for verification
      sessionStorage.setItem('deel_oauth_state', result.state || '');
      // Navigate directly to avoid CSP issues
      window.location.href = result.authUrl;
    }
    
    return result;
  } catch (error) {
    console.error('Failed to initialize Deel OAuth:', error);
    throw error;
  }
}

/**
 * Get current Deel access token
 */
export async function getDeelAccessToken(): Promise<{ success: boolean; accessToken?: string }> {
  try {
    const url = new URL(`${SUPABASE_URL}/functions/v1/deel-oauth`);
    url.searchParams.set('action', 'token');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${currentUserToken}`,
        'Content-Type': 'application/json'
      },
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
 * Make authenticated Deel API call
 */
async function deelApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const tokenResponse = await getDeelAccessToken();
  
  if (!tokenResponse.success || !tokenResponse.accessToken) {
    throw new Error('No valid Deel access token. Please re-authorize.');
  }

  const baseUrl = 'https://api.sandbox.deel.com'; // Use environment variable in production
  const url = `${baseUrl}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenResponse.accessToken}`,
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Deel API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch employees from Deel
 */
export async function getDeelEmployees(): Promise<DeelEmployee[]> {
  try {
    const response = await deelApiCall<{ data: DeelEmployee[] }>('/api/v1/employees');
    return response.data;
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
    const response = await deelApiCall<{ data: DeelContract[] }>('/api/v1/contracts');
    return response.data;
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
 * Run compliance analysis on employee data
 */
export async function runComplianceAnalysis(employeeId: string): Promise<DeelComplianceAlert[]> {
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

// For development/testing - simulate API calls
export function simulateApiCall<T>(data: T, delay: number = 1000): Promise<{ success: boolean; data: T }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data });
    }, delay);
  });
}