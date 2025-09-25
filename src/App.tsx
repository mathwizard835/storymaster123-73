import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isMobilePlatform } from "@/lib/mobileFeatures";
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

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const isTrialMode = searchParams.get('trial') === 'true';
  const isMobile = isMobilePlatform();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  // Allow access in trial mode or for mobile users without authentication
  if (!user && !isTrialMode && !isMobile) {
    return <Navigate to="/auth" replace />;
  }
  
  // For mobile users without auth, redirect to trial mode instead of auth
  if (!user && isMobile && !isTrialMode) {
    return <Navigate to="/?trial=true" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const isMobile = isMobilePlatform();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  // For mobile users, redirect to home instead of auth loop
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* For mobile, make auth optional - redirect mobile users to home */}
              <Route path="/auth" element={
                isMobilePlatform() ? 
                  <Navigate to="/" replace /> : 
                  <PublicRoute><Auth /></PublicRoute>
              } />
              <Route path="/" element={<Index />} />
              <Route path="/profile" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
              <Route path="/mission" element={<Mission />} />
              <Route path="/gallery" element={<ProtectedRoute><StoryGallery /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/coming-soon" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
