// API utility functions for backend integration

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

// For development/testing - simulate API calls
export function simulateApiCall<T>(data: T, delay: number = 1000): Promise<{ success: boolean; data: T }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data });
    }, delay);
  });
}