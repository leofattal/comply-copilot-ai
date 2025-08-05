import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import MainDashboard from "@/components/MainDashboard";
import Index from "./pages/Index";
import OnboardingFlow from "./pages/OnboardingFlow";
import SmartOnboardingWrapper from "./components/SmartOnboardingWrapper";
import DashboardOverview from "./pages/DashboardOverview";
import EmployeesPage from "./pages/EmployeesPage";
import ContractsPage from "./pages/ContractsPage";
import CompliancePage from "./pages/CompliancePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import DeelDashboard from "./pages/DeelDashboard";
import DeelCallback from "./pages/DeelCallback";
import Auth from "./components/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <SmartOnboardingWrapper />
              </ProtectedRoute>
            } />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/deel/callback" element={<DeelCallback />} />
            
            {/* Main Dashboard Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <MainDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="compliance" element={<CompliancePage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            
            {/* Legacy routes for backward compatibility - redirect to dashboard */}
            <Route 
              path="/deel" 
              element={<Navigate to="/dashboard" replace />}
            />
            <Route 
              path="/deel-dashboard" 
              element={<Navigate to="/dashboard" replace />}
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
