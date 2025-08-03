import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { setUserToken } from '@/lib/api';

export default function DeelCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(`OAuth Error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state parameter');
          return;
        }

        // Verify state matches what we stored (for direct navigation flow)
        const storedState = sessionStorage.getItem('deel_oauth_state');
        if (storedState && state !== storedState) {
          setStatus('error');
          setMessage('State parameter mismatch - possible security issue');
          return;
        }

        // Clear the stored state
        sessionStorage.removeItem('deel_oauth_state');

        // Call the Supabase Edge Function to exchange the code for tokens
        console.log('🔄 Calling Supabase Edge Function to exchange code for tokens...');
        
        // Get current user session and set token for API calls
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
          throw new Error('User not authenticated. Please log in again.');
        }
        
        // Set the user token for API calls
        setUserToken(session.access_token);
        
        // Call the Edge Function with callback action
        console.log('🔄 Calling Edge Function with callback action...');
        const { data: response, error: functionError } = await supabase.functions.invoke('deel-oauth', {
          body: { action: 'callback', code, state }
        });
        
        console.log('📡 Edge Function response:', { response, functionError });
        
        if (functionError) {
          console.error('❌ Edge Function error:', functionError);
          throw new Error(`Edge Function error: ${functionError.message}`);
        }

        if (response?.success) {
          setStatus('success');
          setMessage('Authorization successful! Redirecting to dashboard...');
          
          // Notify parent window if this is a popup
          if (window.opener) {
            window.opener.postMessage({ type: 'DEEL_OAUTH_SUCCESS' }, '*');
            window.close();
          } else {
            // If not a popup, redirect to dashboard and signal success
            setTimeout(() => {
              navigate('/deel?oauth_success=true');
            }, 2000);
          }
        } else {
          setStatus('error');
          setMessage(`Authorization failed: ${response?.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage(`Callback processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            
            {status === 'processing' && 'Processing Authorization'}
            {status === 'success' && 'Authorization Successful'}
            {status === 'error' && 'Authorization Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className={status === 'error' ? 'border-red-200 bg-red-50' : status === 'success' ? 'border-green-200 bg-green-50' : ''}>
            <AlertDescription>
              {message}
            </AlertDescription>
          </Alert>

          {status === 'success' && (
            <div className="mt-4 text-sm text-gray-600 text-center">
              You will be redirected to the dashboard shortly...
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/deel')}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}