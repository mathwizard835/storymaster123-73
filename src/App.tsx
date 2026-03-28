import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { initializeRevenueCat, identifyUser, logOutRevenueCat } from "@/lib/iapService";
import { initDeepLinkHandler } from "@/lib/deepLinkHandler";
import { initPushNotifications } from "@/lib/pushNotifications";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProfileSetup from "./pages/ProfileSetup";
import Mission from "./pages/Mission";
import ComingSoon from "./pages/ComingSoon";
import StoryGallery from "./pages/StoryGallery";
import Achievements from "./pages/Achievements";
import Dashboard from "./pages/Dashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Support from "./pages/Support";
import ParentDashboard from "./pages/ParentDashboard";
import Subscription from "./pages/Subscription";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  // Allow email verification callbacks to complete before redirecting
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const isEmailVerification = hashParams.get('type') === 'signup' || hashParams.get('type') === 'recovery';
  
  if (user && !isEmailVerification) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const DeepLinkInitializer = () => {
  const navigate = useNavigate();
  useEffect(() => {
    initDeepLinkHandler(navigate);
  }, [navigate]);
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<PublicRoute><PageTransition><Auth /></PageTransition></PublicRoute>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/" element={<Index />} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><ProfileSetup /></PageTransition></ProtectedRoute>} />
        <Route path="/mission" element={<ProtectedRoute><Mission /></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><PageTransition><StoryGallery /></PageTransition></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><PageTransition><Achievements /></PageTransition></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute><PageTransition><Subscription /></PageTransition></ProtectedRoute>} />
        <Route path="/subscription/success" element={<PageTransition><SubscriptionSuccess /></PageTransition>} />
        <Route path="/coming-soon" element={<ProtectedRoute><PageTransition><ComingSoon /></PageTransition></ProtectedRoute>} />
        <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
        <Route path="/support" element={<PageTransition><Support /></PageTransition>} />
        <Route path="/parent-dashboard" element={<ProtectedRoute><PageTransition><ParentDashboard /></PageTransition></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  // Load saved theme and initialize RevenueCat on app mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("premium-theme");
    if (savedTheme && savedTheme !== "default") {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    // Initialize RevenueCat for native IAP
    initializeRevenueCat();
    
    // Initialize push notifications for native
    initPushNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DeviceProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <DeepLinkInitializer />
              <AnimatedRoutes />
              <MobileBottomNav />
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </DeviceProvider>
    </QueryClientProvider>
  );
};

export default App;
