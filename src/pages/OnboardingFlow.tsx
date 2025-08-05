import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Upload, 
  Database, 
  Shield,
  Users,
  FileText,
  Zap,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTemplateModal from '@/components/DataTemplateModal';
import DeelOnboardingIntegration from '@/components/DeelOnboardingIntegration';
import { 
  saveUserOnboardingState, 
  saveUserPlatformConnection,
  completeUserOnboarding 
} from '@/lib/userPreferences';

interface HRPlatform {
  id: string;
  name: string;
  description: string;
  logo: string;
  integrationType: 'api' | 'manual' | 'both';
  features: string[];
  setupTime: string;
  status: 'available' | 'coming-soon' | 'beta';
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<{ onNext: (data: any) => void; onBack: () => void; data: any }>;
}

const hrPlatforms: HRPlatform[] = [
  {
    id: 'deel',
    name: 'Deel',
    description: 'Global payroll and compliance platform',
    logo: '🟢',
    integrationType: 'api',
    features: ['Real-time sync', 'Global compliance', 'Contract management'],
    setupTime: '2 minutes',
    status: 'available'
  },
  {
    id: 'gusto',
    name: 'Gusto',
    description: 'Payroll, benefits, and HR platform',
    logo: '🟠',
    integrationType: 'api',
    features: ['Payroll data', 'Employee records', 'Benefits info'],
    setupTime: '3 minutes',
    status: 'coming-soon'
  },
  {
    id: 'trinet',
    name: 'TriNet',
    description: 'Professional employer organization (PEO)',
    logo: '🔵',
    integrationType: 'api',
    features: ['PEO services', 'Compliance management', 'Risk mitigation'],
    setupTime: '5 minutes',
    status: 'coming-soon'
  },
  {
    id: 'bamboo',
    name: 'BambooHR',
    description: 'HR information system',
    logo: '🟡',
    integrationType: 'api',
    features: ['Employee data', 'Performance tracking', 'Time tracking'],
    setupTime: '3 minutes',
    status: 'coming-soon'
  },
  {
    id: 'workday',
    name: 'Workday',
    description: 'Enterprise HR and finance platform',
    logo: '🟣',
    integrationType: 'api',
    features: ['Enterprise HR', 'Advanced analytics', 'Global compliance'],
    setupTime: '10 minutes',
    status: 'beta'
  },
  {
    id: 'manual',
    name: 'Manual Upload',
    description: 'Upload your employee and contract data',
    logo: '📁',
    integrationType: 'manual',
    features: ['CSV/Excel upload', 'Flexible format', 'No integration needed'],
    setupTime: '5 minutes',
    status: 'available'
  },
  {
    id: 'other',
    name: 'Other Platform',
    description: 'We can help you integrate with your platform',
    logo: '🔗',
    integrationType: 'both',
    features: ['Custom integration', 'API support', 'Consultation'],
    setupTime: 'Contact us',
    status: 'coming-soon'
  }
];

// Step 1: Welcome and Platform Selection
const PlatformSelectionStep: React.FC<{ onNext: (data: any) => void; onBack: () => void; data: any }> = ({ onNext, onBack, data }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(data.selectedPlatform || '');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Welcome to ComplyAI!</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Let's get you set up with AI-powered compliance monitoring. 
          First, tell us about your HR platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hrPlatforms.map((platform) => (
          <Card 
            key={platform.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedPlatform === platform.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setSelectedPlatform(platform.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">{platform.logo}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-lg">{platform.name}</h3>
                    {platform.status === 'beta' && (
                      <Badge variant="secondary" className="text-xs">Beta</Badge>
                    )}
                    {platform.status === 'coming-soon' && (
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{platform.description}</p>
                  
                  <div className="space-y-2">
                    {platform.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Setup: {platform.setupTime}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={() => onNext({ selectedPlatform })}
          disabled={!selectedPlatform}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

// Step 2: Integration Setup
const PlatformSetupStep: React.FC<{ onNext: (data: any) => void; onBack: () => void; data: any }> = ({ onNext, onBack, data }) => {
  const selectedPlatform = hrPlatforms.find(p => p.id === data.selectedPlatform);
  
  if (!selectedPlatform) {
    return (
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Platform Not Found</h3>
        <p className="text-red-600 mb-4">Please go back and select a platform.</p>
        <Button onClick={onBack} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  // Handle Manual Upload
  if (data.selectedPlatform === 'manual') {
    return <DataUploadStep onNext={onNext} onBack={onBack} data={data} />;
  }

  // Handle Deel Integration
  if (data.selectedPlatform === 'deel') {
    return (
      <DeelOnboardingIntegration
        onComplete={(success) => {
          if (success) {
            onNext({ 
              integrationType: 'api', 
              platform: 'deel', 
              connected: true,
              setupComplete: true 
            });
          }
        }}
        onError={(error) => {
          console.error('Deel integration error:', error);
          // Could show error state or fallback to manual upload
        }}
      />
    );
  }

  // Handle other platforms (coming soon)
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="text-4xl">{selectedPlatform.logo}</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{selectedPlatform.name} Integration</h2>
          <p className="text-gray-600 mt-2">
            {selectedPlatform.name} integration is coming soon!
          </p>
        </div>
      </div>

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6 text-center">
          <Clock className="h-12 w-12 text-orange-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-orange-900 mb-2">Coming Soon</h3>
          <p className="text-orange-700 mb-4">
            We're working on {selectedPlatform.name} integration. For now, you can upload your data manually.
          </p>
          <Button 
            onClick={() => onNext({ 
              integrationType: 'manual', 
              platform: data.selectedPlatform,
              fallbackToManual: true 
            })}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Files Instead
          </Button>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Platform Selection
        </Button>
      </div>
    </div>
  );
};

// Step 3: Data Upload (for manual option)
const DataUploadStep: React.FC<{ onNext: (data: any) => void; onBack: () => void; data: any }> = ({ onNext, onBack, data }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleProcessData = async () => {
    setIsProcessing(true);
    // Simulate data processing
    setTimeout(() => {
      onNext({ 
        integrationType: 'manual', 
        platform: data.platform,
        uploadedFiles: uploadedFiles.map(f => f.name)
      });
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Upload Your Data</h2>
        <p className="text-xl text-gray-600">
          Upload your employee and contract data files
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Required Data Files</CardTitle>
          <CardDescription>
            Upload the following files to run compliance analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Employee Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                CSV or Excel file with employee information
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
              />
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Contract Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                CSV or Excel file with contract information
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
              />
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Uploaded Files:</h4>
              <div className="space-y-1">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{file.name}</span>
                    <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Data Requirements:</h4>
            <ul className="text-sm space-y-1">
              <li>• Employee names, locations, and job titles</li>
              <li>• Contract terms, start dates, and compensation</li>
              <li>• Working hours and classification status</li>
              <li>• Any existing compliance documentation</li>
            </ul>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => setShowTemplates(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Download Templates
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleProcessData}
          disabled={uploadedFiles.length === 0 || isProcessing}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Data...
            </>
          ) : (
            <>
              Process & Analyze
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      <DataTemplateModal 
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onDownloadTemplate={(template) => {
          console.log('Template downloaded:', template.name);
        }}
      />
    </div>
  );
};

// Step 4: Analysis Results
const AnalysisResultsStep: React.FC<{ onNext: (data: any) => void; onBack: () => void; data: any }> = ({ onNext, onBack, data }) => {
  const navigate = useNavigate();

  const handleComplete = async () => {
    // Save platform connection
    if (data.platform && data.integrationType) {
      const platformName = hrPlatforms.find(p => p.id === data.platform)?.name || data.platform;
      
      await saveUserPlatformConnection({
        platform_id: data.platform,
        platform_name: platformName,
        connection_status: 'connected',
        integration_type: data.integrationType,
        connected_at: new Date().toISOString(),
        configuration: data.configuration || {}
      });
    }
    
    // Complete onboarding
    await completeUserOnboarding([data.platform]);
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold">Setup Complete!</h2>
        <p className="text-xl text-gray-600">
          Your compliance analysis is ready
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
          <CardDescription>
            Here's what we found in your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">50</div>
              <div className="text-sm text-gray-600">Employees Analyzed</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">5</div>
              <div className="text-sm text-gray-600">Critical Issues Found</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">90%</div>
              <div className="text-sm text-gray-600">Compliance Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">Action Required</h4>
            <p className="text-sm text-yellow-700 mt-1">
              We found 5 critical compliance issues that need immediate attention. 
              Review them in your dashboard to ensure compliance.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-6">
        <Button onClick={handleComplete} size="lg">
          <Shield className="w-5 h-5 mr-2" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'platform-selection',
    title: 'Choose Your Platform',
    description: 'Select your HR platform or upload data manually',
    component: PlatformSelectionStep
  },
  {
    id: 'platform-setup',
    title: 'Setup Integration',
    description: 'Connect your platform and sync data',
    component: PlatformSetupStep
  },
  {
    id: 'analysis-results',
    title: 'Analysis Complete',
    description: 'Review your compliance analysis results',
    component: AnalysisResultsStep
  }
];

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<any>({});
  const navigate = useNavigate();

  const handleNext = async (data: any) => {
    const newData = { ...stepData, ...data };
    setStepData(newData);
    
    // Save onboarding progress
    await saveUserOnboardingState({
      completed: false,
      current_step: currentStep + 1,
      selected_platforms: newData.selectedPlatform ? [newData.selectedPlatform] : []
    });
    
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      await completeUserOnboarding(newData.selectedPlatform ? [newData.selectedPlatform] : []);
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/');
    }
  };

  const currentStepComponent = onboardingSteps[currentStep];
  const CurrentStepComponent = currentStepComponent.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">ComplyAI</span>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              Exit Setup
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {onboardingSteps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / onboardingSteps.length) * 100)}% Complete
            </span>
          </div>
          <Progress value={((currentStep + 1) / onboardingSteps.length) * 100} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <CurrentStepComponent 
          onNext={handleNext}
          onBack={handleBack}
          data={stepData}
        />
      </div>
    </div>
  );
} 