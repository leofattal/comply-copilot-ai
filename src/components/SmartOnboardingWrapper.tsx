import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import OnboardingFlow from '@/pages/OnboardingFlow';
import { 
  hasUserCompletedOnboarding, 
  hasUserPlatformConnections, 
  getUserPlatformConnections 
} from '@/lib/userPreferences';

export default function SmartOnboardingWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      console.log('🔍 Checking user onboarding status...');
      
      // Check if user has completed onboarding
      const hasCompleted = await hasUserCompletedOnboarding();
      console.log('📋 Has completed onboarding:', hasCompleted);
      
      // Check if user has any active platform connections
      const hasConnections = await hasUserPlatformConnections();
      console.log('🔗 Has platform connections:', hasConnections);
      
      if (hasCompleted && hasConnections) {
        // User has completed onboarding and has connections - go to dashboard
        console.log('✅ User ready - redirecting to dashboard');
        navigate('/dashboard');
      } else if (hasCompleted && !hasConnections) {
        // User completed onboarding but has no active connections
        // This could happen if they disconnected or had connection issues
        console.log('⚠️ User completed onboarding but has no connections - showing platform reconnection');
        
        const connections = await getUserPlatformConnections();
        if (connections.length > 0) {
          // They have connection records but not active - show dashboard anyway
          console.log('📊 User has connection history - redirecting to dashboard');
          navigate('/dashboard');
        } else {
          // No connection records at all - restart onboarding
          console.log('🔄 No connection history - restarting onboarding');
          setShouldShowOnboarding(true);
        }
      } else {
        // User hasn't completed onboarding - show onboarding flow
        console.log('🚀 Starting onboarding flow');
        setShouldShowOnboarding(true);
      }
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      // On error, show onboarding to be safe
      setShouldShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">Checking your setup...</p>
        </div>
      </div>
    );
  }

  if (shouldShowOnboarding) {
    return <OnboardingFlow />;
  }

  // This shouldn't render as we redirect to dashboard
  return null;
}