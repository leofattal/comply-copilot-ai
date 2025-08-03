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
import { 
  storeDeelCredentials, 
  initializeDeelOAuth, 
  getDeelEmployees, 
  getDeelContracts,
  runComplianceAnalysis,
  type DeelEmployee,
  type DeelContract,
  type DeelComplianceAlert 
} from '@/lib/api';

interface ConnectionStatus {
  credentials: 'not_configured' | 'configured' | 'error';
  oauth: 'not_authorized' | 'authorized' | 'expired' | 'error';
  lastSync?: string;
}

export default function DeelIntegration() {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>({
    credentials: 'not_configured',
    oauth: 'not_authorized'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<DeelEmployee[]>([]);
  const [contracts, setContracts] = useState<DeelContract[]>([]);
  const [alerts, setAlerts] = useState<DeelComplianceAlert[]>([]);

  useEffect(() => {
    if (user && session) {
      checkConnectionStatus();
    }
  }, [user, session]);

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
  }, []);

  const checkConnectionStatus = async () => {
    try {
      // Check if credentials are actually stored
      const credentialsResponse = await getDeelCredentials();
      
      const credentialsStatus = credentialsResponse.success ? 'configured' : 'not_configured';
      
      setStatus({
        credentials: credentialsStatus,
        oauth: 'not_authorized', // We'll check this separately when needed
        lastSync: new Date().toISOString()
      });
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
      // Initialize with the provided credentials
      await storeDeelCredentials({
        clientId: 'ced9ba0f-d3b3-475b-80f2-57f1f0b9d161',
        clientSecret: 'cyQ6VV9CNzVMW3lLO1xHNQ==',
        authorizeUri: 'https://app.deel.com/oauth2/authorize',
        sandboxBaseUrl: 'https://api.sandbox.deel.com',
        productionBaseUrl: 'https://api.deel.com'
      });

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

      const response = await initializeDeelOAuth();
      
      if (response.success && response.authUrl) {
        // Open OAuth popup
        const popup = window.open(
          response.authUrl,
          'deel-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Poll for popup closure
        const pollTimer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            checkConnectionStatus();
          }
        }, 1000);
      } else {
        throw new Error(response.error || 'Failed to initialize OAuth flow');
      }
    } catch (error) {
      console.error('OAuth flow error:', error);
      setError(error instanceof Error ? error.message : 'OAuth initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    
    try {
      const [employeesData, contractsData] = await Promise.all([
        getDeelEmployees(),
        getDeelContracts()
      ]);

      setEmployees(employeesData);
      setContracts(contractsData);

      // Run compliance analysis for first employee as example
      if (employeesData.length > 0) {
        const complianceData = await runComplianceAnalysis(employeesData[0].id);
        setAlerts(complianceData);
      }

      setStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
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
              <Button 
                onClick={loadData} 
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync Data
              </Button>
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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{employees.length}</p>
                  <p className="text-sm text-gray-500">Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{contracts.length}</p>
                  <p className="text-sm text-gray-500">Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{alerts.length}</p>
                  <p className="text-sm text-gray-500">Compliance Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Compliance Alerts
            </CardTitle>
            <CardDescription>
              Recent compliance issues detected in your Deel data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-red-500' :
                    alert.severity === 'high' ? 'text-orange-500' :
                    alert.severity === 'medium' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-gray-600">{alert.description}</p>
                    <p className="text-sm text-blue-600 mt-1">{alert.recommended_action}</p>
                  </div>
                  <Badge className={
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}