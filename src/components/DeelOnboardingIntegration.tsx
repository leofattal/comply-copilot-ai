import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Settings,
  Users,
  Shield,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  storeDeelCredentials, 
  initializeDeelOAuth, 
  getDeelCredentialsLocal,
  getDeelAccessToken,
  setUserToken
} from '@/lib/api';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

interface DeelOnboardingIntegrationProps {
  onComplete: (success: boolean) => void;
  onError: (error: string) => void;
}

export default function DeelOnboardingIntegration({ onComplete, onError }: DeelOnboardingIntegrationProps) {
  const { user, session } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'credentials',
      title: 'Initialize Credentials',
      description: 'Setting up secure connection to Deel',
      status: 'pending'
    },
    {
      id: 'oauth',
      title: 'Authorize Access',
      description: 'Connecting to your Deel account',
      status: 'pending'
    },
    {
      id: 'verification',
      title: 'Verify Connection',
      description: 'Testing data access and permissions',
      status: 'pending'
    }
  ]);

  useEffect(() => {
    if (user && session?.access_token) {
      setUserToken(session.access_token);
      checkExistingConnection();
    }
  }, [user, session]);

  const checkExistingConnection = async () => {
    try {
      console.log('🔍 Checking existing Deel connection...');
      
      // Check if we already have credentials
      const localCreds = getDeelCredentialsLocal();
      if (localCreds) {
        updateStepStatus('credentials', 'completed');
        
        // Check if we have OAuth access
        const accessToken = await getDeelAccessToken();
        if (accessToken) {
          updateStepStatus('oauth', 'completed');
          updateStepStatus('verification', 'completed');
          setTimeout(() => onComplete(true), 1000);
          return;
        }
      }
      
      // Start setup process
      setCurrentStep(0);
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const updateStepStatus = (stepId: string, status: SetupStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const startCredentialsSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      updateStepStatus('credentials', 'in_progress');

      console.log('🔧 Starting credentials setup...');
      
      const result = await storeDeelCredentials();
      
      if (result.success) {
        console.log('✅ Credentials setup successful');
        updateStepStatus('credentials', 'completed');
        setCurrentStep(1);
        
        // Auto-start OAuth
        setTimeout(() => startOAuthFlow(), 1000);
      } else {
        throw new Error(result.error || 'Failed to setup credentials');
      }
    } catch (error) {
      console.error('❌ Credentials setup failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Credentials setup failed';
      setError(errorMsg);
      updateStepStatus('credentials', 'error');
      onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const startOAuthFlow = async () => {
    try {
      setLoading(true);
      setError(null);
      updateStepStatus('oauth', 'in_progress');

      console.log('🔐 Starting OAuth flow...');
      
      const result = await initializeDeelOAuth();
      
      if (result.success && result.authUrl) {
        console.log('🚀 Redirecting to OAuth URL...');
        
        // Store onboarding context
        sessionStorage.setItem('onboarding_deel_oauth', 'true');
        
        // Redirect to OAuth
        window.location.href = result.authUrl;
      } else {
        throw new Error(result.error || 'Failed to initialize OAuth');
      }
    } catch (error) {
      console.error('❌ OAuth initialization failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'OAuth setup failed';
      setError(errorMsg);
      updateStepStatus('oauth', 'error');
      onError(errorMsg);
      setLoading(false);
    }
  };

  const verifyConnection = async () => {
    try {
      setLoading(true);
      updateStepStatus('verification', 'in_progress');

      console.log('🔍 Verifying connection...');
      
      // Check if we have access token
      const accessToken = await getDeelAccessToken();
      if (accessToken) {
        console.log('✅ Connection verified successfully');
        updateStepStatus('verification', 'completed');
        
        setTimeout(() => onComplete(true), 1000);
      } else {
        throw new Error('No access token found');
      }
    } catch (error) {
      console.error('❌ Connection verification failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Connection verification failed';
      setError(errorMsg);
      updateStepStatus('verification', 'error');
      onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const retryCurrentStep = () => {
    setError(null);
    if (currentStep === 0) {
      startCredentialsSetup();
    } else if (currentStep === 1) {
      startOAuthFlow();
    } else if (currentStep === 2) {
      verifyConnection();
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };

  const allStepsCompleted = steps.every(step => step.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Users className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Setting up Deel Integration</h2>
          <p className="text-gray-600 mt-2">
            We'll connect to your Deel account to sync employee and contract data
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Setup Progress</CardTitle>
            <Badge variant={allStepsCompleted ? 'default' : 'secondary'}>
              {steps.filter(s => s.status === 'completed').length} of {steps.length} complete
            </Badge>
          </div>
          <Progress value={getProgressPercentage()} className="mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {step.status === 'completed' && (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  )}
                  {step.status === 'in_progress' && (
                    <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                  )}
                  {step.status === 'error' && (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  )}
                  {step.status === 'pending' && (
                    <div className="h-6 w-6 bg-gray-200 rounded-full" />
                  )}
                </div>
                <div className="flex-grow">
                  <h4 className={`font-medium ${
                    step.status === 'completed' ? 'text-green-900' :
                    step.status === 'in_progress' ? 'text-blue-900' :
                    step.status === 'error' ? 'text-red-900' :
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
                {step.status === 'in_progress' && index === currentStep && (
                  <Badge variant="outline">In Progress</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col space-y-4">
        {!allStepsCompleted && !loading && (
          <>
            {currentStep === 0 && (
              <Button 
                onClick={startCredentialsSetup} 
                className="w-full gap-2"
                disabled={steps[0].status === 'completed'}
              >
                <Settings className="h-4 w-4" />
                {steps[0].status === 'completed' ? 'Credentials Ready' : 'Initialize Connection'}
              </Button>
            )}
            
            {currentStep === 1 && steps[0].status === 'completed' && (
              <Button 
                onClick={startOAuthFlow} 
                className="w-full gap-2"
                disabled={steps[1].status === 'completed'}
              >
                <ExternalLink className="h-4 w-4" />
                {steps[1].status === 'completed' ? 'OAuth Completed' : 'Authorize Deel Access'}
              </Button>
            )}

            {error && (
              <Button 
                onClick={retryCurrentStep} 
                variant="outline" 
                className="w-full gap-2"
              >
                <Shield className="h-4 w-4" />
                Retry Setup
              </Button>
            )}
          </>
        )}

        {allStepsCompleted && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Setup Complete!</strong> Your Deel integration is ready. Redirecting to dashboard...
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Features Preview */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            What you'll get with Deel integration:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Real-time employee data sync
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Automated contract compliance monitoring
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Global employment law compliance checks
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Intelligent policy recommendations
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}