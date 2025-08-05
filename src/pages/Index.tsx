import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Solutions from "@/components/Solutions";
import Pricing from "@/components/Pricing";
import About from "@/components/About";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { 
  hasUserCompletedOnboarding
} from "@/lib/userPreferences";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect authenticated users
    const checkUserStatusAndRedirect = async () => {
      if (loading) return; // Wait for auth to load
      
      if (user) {
        console.log('🔍 Authenticated user detected on landing page, checking status...');
        
        try {
          // Check if user has completed onboarding
          const hasCompleted = await hasUserCompletedOnboarding();
          
          if (hasCompleted) {
            // User has completed onboarding - redirect to dashboard
            console.log('✅ User has completed onboarding - redirecting to dashboard');
            navigate('/dashboard');
          } else {
            // User needs to complete onboarding
            console.log('🚀 User needs onboarding - redirecting to onboarding flow');
            navigate('/onboarding');
          }
        } catch (error) {
          console.error('❌ Error checking user status:', error);
          // On error, default to onboarding
          navigate('/onboarding');
        }
      }
    };

    checkUserStatusAndRedirect();
  }, [user, loading, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show landing page for non-authenticated users
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Features />
        <Solutions />
        <Pricing />
        <About />
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
