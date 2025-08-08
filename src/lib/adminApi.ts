import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://eufsshczsdzfxmlkbpey.supabase.co';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
};

// Helper function to make authenticated requests to Supabase Edge Functions
const makeEdgeFunctionRequest = async (
  functionName: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  
  const headers = await getAuthHeaders();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  return response;
};

// Upload file to admin endpoint
export const uploadFile = async (file: File, title?: string): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) {
    formData.append('title', title);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-upload-file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
  }

  return response.json();
};

// Submit URL to admin endpoint
export const submitUrl = async (urlData: {
  url: string;
  title: string;
  description?: string;
}): Promise<any> => {
  const response = await makeEdgeFunctionRequest('admin-submit-url', {
    method: 'POST',
    body: JSON.stringify(urlData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `URL submission failed: ${response.statusText}`);
  }

  return response.json();
};

// Get ingestion status
export const getIngestStatus = async (): Promise<any> => {
  const response = await makeEdgeFunctionRequest('admin-ingest-status', {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to fetch status: ${response.statusText}`);
  }

  return response.json();
};

// Get document chunks
export const getDocumentChunks = async (docId: string): Promise<any> => {
  const response = await makeEdgeFunctionRequest(`admin-document-chunks/${docId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to fetch chunks: ${response.statusText}`);
  }

  return response.json();
};

// Delete document
export const deleteDocument = async (docId: string): Promise<any> => {
  const response = await makeEdgeFunctionRequest(`admin-ingest-status/${docId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to delete document: ${response.statusText}`);
  }

  return response.json();
};

// Trigger document processing
export const processDocument = async (docId: string): Promise<any> => {
  const response = await makeEdgeFunctionRequest('process-document', {
    method: 'POST',
    body: JSON.stringify({ doc_id: docId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to process document: ${response.statusText}`);
  }

  return response.json();
};
