import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eufsshczsdzfxmlkbpey.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZnNzaGN6c2R6ZnhtbGticGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxODczMjgsImV4cCI6MjA2OTc2MzMyOH0.eM-eiGCKhDOzHcKdnGpefj4hm6mdVDRL7gxkkryyNJc';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      deel_credentials: {
        Row: {
          id: number;
          user_id: string;
          client_id: string;
          client_secret: string;
          authorize_uri: string;
          sandbox_base_url: string;
          production_base_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          client_id: string;
          client_secret: string;
          authorize_uri: string;
          sandbox_base_url: string;
          production_base_url: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          client_secret?: string;
          authorize_uri?: string;
          sandbox_base_url?: string;
          production_base_url?: string;
          updated_at?: string;
        };
      };
      deel_tokens: {
        Row: {
          id: number;
          user_id: string;
          access_token: string;
          refresh_token: string | null;
          expires_at: string;
          scope: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          access_token: string;
          refresh_token?: string | null;
          expires_at: string;
          scope?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          refresh_token?: string | null;
          expires_at?: string;
          scope?: string | null;
          updated_at?: string;
        };
      };
      oauth_states: {
        Row: {
          id: number;
          user_id: string;
          state: string;
          provider: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          user_id: string;
          state: string;
          provider: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          state?: string;
          provider?: string;
          expires_at?: string;
        };
      };
    };
  };
}

// Helper function to get the current session
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
};

// Helper function to get the current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
};