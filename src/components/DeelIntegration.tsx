import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Users, 
  FileText, 
  DollarSign,
  RefreshCw,
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  storeDeelCredentials, 
  initializeDeelOAuth, 
  storeDeelCredentialsLocal,
  getDeelCredentialsLocal,
  getDeelAccessToken,
  setUserToken,
  type DeelEmployee,
  type DeelContract
} from '@/lib/api';
import { useDeelData } from '@/hooks/useDeelData';

interface ConnectionStatus {
  credentials: 'not_configured' | 'configured' | 'error';
  oauth: 'not_authorized' | 'authorized' | 'expired' | 'error';
  lastSync?: string;
}

interface DeelIntegrationProps {
  onDataLoad?: (data: { employees: DeelEmployee[]; contracts: DeelContract[] }) => void;
  onNavigateToCompliance?: () => void;
  onNavigateToEmployees?: () => void;
  onNavigateToContracts?: () => void;
}

export default function DeelIntegration({ onDataLoad, onNavigateToCompliance, onNavigateToEmployees, onNavigateToContracts }: DeelIntegrationProps) {
  const { user, session } = useAuth();
  const { 
    employees, 
    contracts, 
    loading: dataLoading, 
    loadData, 
    error: dataError,
    complianceReport
  } = useDeelData();
  const [status, setStatus] = useState<ConnectionStatus>({
    credentials: 'not_configured',
    oauth: 'not_authorized'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && session) {
      // Set user token for API calls
      if (session.access_token) {
        setUserToken(session.access_token);
      }
      checkConnectionStatus();
    }
  }, [user, session]);

  useEffect(() => {
    // Check for OAuth success parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('oauth_success') === 'true') {
      // Remove the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Force refresh status after OAuth success
      setTimeout(() => {
        checkConnectionStatus();
      }, 1000);
    }
  }, []);

  useEffect(() => {
    // Listen for OAuth success message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DEEL_OAUTH_SUCCESS') {
        setStatus(prev => ({ ...prev, oauth: 'authorized' }));
        loadData();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadData]);

  const checkConnectionStatus = async () => {
    try {
      // Check credentials in localStorage (CSP-friendly)
      const credentials = getDeelCredentialsLocal();
      
      const credentialsStatus = credentials ? 'configured' : 'not_configured';
      
      // Check OAuth authorization status by trying to get access token
      let oauthStatus: 'not_authorized' | 'authorized' = 'not_authorized';
      
      if (credentialsStatus === 'configured') {
        try {
          const tokenResponse = await getDeelAccessToken();
          oauthStatus = tokenResponse.success && tokenResponse.accessToken ? 'authorized' : 'not_authorized';
        } catch (error) {
          console.log('No valid OAuth token found:', error);
          oauthStatus = 'not_authorized';
        }
      }
      
      setStatus({
        credentials: credentialsStatus,
        oauth: oauthStatus,
        lastSync: new Date().toISOString()
      });
      
      // If authorized, load data
      if (oauthStatus === 'authorized') {
        loadData();
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setStatus({
        credentials: 'not_configured',
        oauth: 'not_authorized'
      });
    }
  };

  const initializeCredentials = async () => {
    setLoading(true);
    setError(null);

    try {
      // SANDBOX CREDENTIALS - Using actual credentials from oauth2-deel-data.json  
      // Use ngrok URL for development
      const redirectUri = 'https://636c85911d89.ngrok-free.app/auth/deel/callback';
      
      const credentials = {
        clientId: '9e6d498b-cc67-489c-ac64-d44c7a2b2a4b', // From oauth2-deel-data.json
        clientSecret: 'aSM5dGZZSHFcW0R1KSwjRQ==', // From oauth2-deel-data.json
        authorizeUri: 'https://app.demo.deel.com/oauth2/authorize', // CORRECT: app.demo.deel.com (user confirmed)
        tokenUri: 'https://app.demo.deel.com/oauth2/tokens', // CORRECT: app.demo.deel.com to match authorization endpoint 
        sandboxBaseUrl: 'https://api-sandbox.demo.deel.com', // OFFICIAL: api-sandbox.demo.deel.com per Deel documentation
        productionBaseUrl: 'https://api.letsdeel.com',
        redirectUri: redirectUri // Dynamic redirect URI for current environment
      };

      // Store locally for CSP-friendly access
      storeDeelCredentialsLocal(credentials);
      
      // Also try to store in API (best effort, may fail due to CSP)
      try {
        await storeDeelCredentials(credentials);
      } catch (apiError) {
        console.warn('Failed to store credentials in API (CSP restriction):', apiError);
        // Continue anyway since we have local storage
      }

      setStatus(prev => ({ ...prev, credentials: 'configured' }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to store credentials');
      setStatus(prev => ({ ...prev, credentials: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const startOAuthFlow = async () => {
    setLoading(true);
    setError(null);

    try {
      // First ensure credentials are configured
      if (status.credentials !== 'configured') {
        throw new Error('Please initialize credentials first before starting OAuth flow');
      }

      // The initializeDeelOAuth function handles direct navigation
      // This will redirect the user to Deel's OAuth page
      console.log('🔄 Calling initializeDeelOAuth...');
      await initializeDeelOAuth();
      
      // If we reach here, redirect occurred successfully
      // Note: This line should not be reached due to immediate redirect
      console.log('✅ OAuth initialization completed - redirect should have occurred');
    } catch (error) {
      console.error('OAuth flow error:', error);
      setError(error instanceof Error ? error.message : 'OAuth initialization failed');
      setLoading(false);
    }
    // Note: setLoading(false) is not in finally because we expect a redirect
  };

  const handleSyncData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await loadData();
      setStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Notify parent when data is loaded
  useEffect(() => {
    if (onDataLoad && (employees.length > 0 || contracts.length > 0)) {
      onDataLoad({ employees, contracts });
    }
  }, [employees, contracts, onDataLoad]);

  const testApiEndpoints = async () => {
    if (status.oauth !== 'authorized') {
      setError('Please complete OAuth authorization first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Call the test Edge Function
      const { data: response, error: functionError } = await supabase.functions.invoke('deel-api-test', {});
      
      if (functionError) {
        throw new Error(`Test function error: ${functionError.message}`);
      }

      console.log('🧪 API Endpoint Test Results:', response);
      
      // Show results in a more user-friendly way
      if (response.results) {
        const workingEndpoints = response.results.filter((r: any) => r.status >= 200 && r.status < 400);
        const errorEndpoints = response.results.filter((r: any) => r.status >= 400);
        
        console.log('✅ Working endpoints:', workingEndpoints);
        console.log('❌ Error endpoints:', errorEndpoints);
        
        alert(`API Test Complete!\n\nWorking endpoints: ${workingEndpoints.length}\nError endpoints: ${errorEndpoints.length}\n\nCheck console for detailed results.`);
      }
    } catch (error) {
      console.error('🧪 Test failed:', error);
      setError(error instanceof Error ? error.message : 'API test failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured':
      case 'authorized':
        return 'bg-green-100 text-green-800';
      case 'not_configured':
      case 'not_authorized':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
      case 'authorized':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Deel Integration Status
          </CardTitle>
          <CardDescription>
            Manage your connection to Deel for automated HR compliance monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Credentials Status */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="font-medium">API Credentials</span>
              </div>
              <Badge className={getStatusColor(status.credentials)}>
                {getStatusIcon(status.credentials)}
                {status.credentials.replace('_', ' ')}
              </Badge>
            </div>

            {/* OAuth Status */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Authorization</span>
              </div>
              <Badge className={getStatusColor(status.oauth)}>
                {getStatusIcon(status.oauth)}
                {status.oauth.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {status.credentials !== 'configured' && (
              <Button 
                onClick={initializeCredentials} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                Initialize Credentials
              </Button>
            )}

            {status.credentials === 'configured' && status.oauth !== 'authorized' && (
              <Button 
                onClick={startOAuthFlow} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Authorize with Deel
              </Button>
            )}

            {status.oauth === 'authorized' && (
              <>
                <Button 
                  onClick={handleSyncData} 
                  disabled={loading || dataLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {loading || dataLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sync Data
                </Button>
                <Button 
                  onClick={testApiEndpoints} 
                  disabled={loading}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  🧪 Test Endpoints
                </Button>
              </>
            )}
          </div>

          {status.lastSync && (
            <p className="text-sm text-gray-500">
              Last synced: {new Date(status.lastSync).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Data Overview */}
      {status.oauth === 'authorized' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onNavigateToEmployees?.()}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{employees.length}</p>
                  <p className="text-sm text-gray-500">Employees</p>
                  {employees.length > 0 && (
                    <p className="text-xs text-gray-400">
                      Click to view details
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onNavigateToContracts?.()}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{contracts.length}</p>
                  <p className="text-sm text-gray-500">Contracts</p>
                  {contracts.length > 0 && (
                    <p className="text-xs text-gray-400">
                      Click to view details
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onNavigateToCompliance?.()}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className={`h-8 w-8 ${complianceReport?.critical_issues ? 'text-orange-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-2xl font-bold">{complianceReport?.critical_issues || 0}</p>
                  <p className="text-sm text-gray-500">Compliance Alerts</p>
                  {complianceReport?.created_at && (
                    <p className="text-xs text-gray-400">
                      Last analysis: {new Date(complianceReport.created_at).toLocaleDateString()}
                    </p>
                  )}
                  {complianceReport ? (
                    <p className="text-xs text-gray-400">
                      Click to view details
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Click to run analysis
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


    </div>
  );
}