-- Required database tables for Deel OAuth Edge Function
-- Run this SQL in your Supabase SQL Editor

-- Table for storing Deel API credentials (encrypted)
CREATE TABLE IF NOT EXISTS deel_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL, -- This should be encrypted in production
  authorize_uri TEXT NOT NULL DEFAULT 'https://app.deel.com/oauth2/authorize',
  sandbox_base_url TEXT NOT NULL DEFAULT 'https://api.sandbox.deel.com',
  production_base_url TEXT NOT NULL DEFAULT 'https://api.deel.com',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Table for storing OAuth access tokens
CREATE TABLE IF NOT EXISTS deel_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Table for OAuth state management (security)
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  provider TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(state)
);

-- Enable Row Level Security
ALTER TABLE deel_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE deel_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deel_credentials
CREATE POLICY "Users can only access their own credentials" ON deel_credentials
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for deel_tokens  
CREATE POLICY "Users can only access their own tokens" ON deel_tokens
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for oauth_states
CREATE POLICY "Users can only access their own OAuth states" ON oauth_states
  FOR ALL USING (auth.uid() = user_id);

-- Function to cleanup expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_deel_tokens_user_id ON deel_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_deel_credentials_user_id ON deel_credentials(user_id);
