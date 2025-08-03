import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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

        // Call the callback endpoint
        const supabaseUrl = 'https://eufsshczsdzfxmlkbpey.supabase.co';
        const callbackUrl = new URL(`${supabaseUrl}/functions/v1/deel-oauth`);
        callbackUrl.searchParams.set('action', 'callback');
        callbackUrl.searchParams.set('code', code);
        callbackUrl.searchParams.set('state', state);

        // Get the user token from localStorage (should be set by auth context)
        const userToken = localStorage.getItem('sb-eufsshczsdzfxmlkbpey-auth-token');
        
        const response = await fetch(callbackUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Authorization successful! Redirecting to dashboard...');
          
          // Notify parent window if this is a popup
          if (window.opener) {
            window.opener.postMessage({ type: 'DEEL_OAUTH_SUCCESS' }, '*');
            window.close();
          } else {
            // If not a popup, redirect to dashboard
            setTimeout(() => {
              navigate('/deel');
            }, 2000);
          }
        } else {
          const errorText = await response.text();
          setStatus('error');
          setMessage(`Authorization failed: ${errorText}`);
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