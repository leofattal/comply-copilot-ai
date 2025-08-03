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
          }\n        } else {\n          const errorText = await response.text();\n          setStatus('error');\n          setMessage(`Authorization failed: ${errorText}`);\n        }\n      } catch (error) {\n        console.error('Callback error:', error);\n        setStatus('error');\n        setMessage(`Callback processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);\n      }\n    };\n\n    handleCallback();\n  }, [searchParams, navigate]);\n\n  return (\n    <div className=\"min-h-screen flex items-center justify-center bg-gray-50 p-4\">\n      <Card className=\"w-full max-w-md\">\n        <CardHeader className=\"text-center\">\n          <CardTitle className=\"flex items-center justify-center gap-2\">\n            {status === 'processing' && <Loader2 className=\"h-5 w-5 animate-spin\" />}\n            {status === 'success' && <CheckCircle className=\"h-5 w-5 text-green-500\" />}\n            {status === 'error' && <AlertCircle className=\"h-5 w-5 text-red-500\" />}\n            \n            {status === 'processing' && 'Processing Authorization'}\n            {status === 'success' && 'Authorization Successful'}\n            {status === 'error' && 'Authorization Failed'}\n          </CardTitle>\n        </CardHeader>\n        <CardContent>\n          <Alert className={status === 'error' ? 'border-red-200 bg-red-50' : status === 'success' ? 'border-green-200 bg-green-50' : ''}>\n            <AlertDescription>\n              {message}\n            </AlertDescription>\n          </Alert>\n\n          {status === 'success' && (\n            <div className=\"mt-4 text-sm text-gray-600 text-center\">\n              You will be redirected to the dashboard shortly...\n            </div>\n          )}\n\n          {status === 'error' && (\n            <div className=\"mt-4 text-center\">\n              <button\n                onClick={() => navigate('/deel')}\n                className=\"text-blue-600 hover:text-blue-800 text-sm underline\"\n              >\n                Return to Dashboard\n              </button>\n            </div>\n          )}\n        </CardContent>\n      </Card>\n    </div>\n  );\n}