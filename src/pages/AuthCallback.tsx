import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error during auth callback:', error);
          navigate('/login');
          return;
        }

        if (data.session) {
          // User is authenticated, check for redirect parameter (URL first, then sessionStorage)
          const urlParams = new URLSearchParams(window.location.search);
          const urlRedirect = urlParams.get('redirect');
          const storedRedirect = sessionStorage.getItem('auth_redirect');
          
          // Use URL redirect first, then fallback to stored redirect
          const redirect = urlRedirect || storedRedirect;
          
          // Clear stored redirect after use
          if (storedRedirect) {
            sessionStorage.removeItem('auth_redirect');
          }
          
          console.log('🔄 Auth callback redirect:', { urlRedirect, storedRedirect, finalRedirect: redirect });
          
          if (redirect === 'onboarding') {
            navigate('/onboarding');
          } else {
            navigate('/dashboard');
          }
        } else {
          // No session, redirect to login
          navigate('/login');
        }
      } catch (error) {
        console.error('Unexpected error during auth callback:', error);
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}