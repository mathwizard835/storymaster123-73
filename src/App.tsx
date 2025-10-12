import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { clearLocalStorageBan, checkDatabaseBan } from "@/lib/contentViolations";
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
import AdminBans from "./pages/AdminBans";

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

  const searchParams = new URLSearchParams(window.location.search);
  const isTrialMode = searchParams.get('trial') === 'true';

  if (!user && !isTrialMode) {
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
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppContent = () => {
  useEffect(() => {
    // Automatically clear localStorage bans that don't exist in database
    const migrateOldBans = async () => {
      const hasLocalBan = localStorage.getItem('user_banned') === 'true';
      if (hasLocalBan) {
        const hasDbBan = await checkDatabaseBan();
        if (!hasDbBan) {
          console.log('Auto-clearing old localStorage ban - not found in database');
          clearLocalStorageBan();
          window.location.reload(); // Reload to apply changes
        }
      }
    };
    migrateOldBans();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Index />} />
        <Route path="/profile" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/gallery" element={<ProtectedRoute><StoryGallery /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/coming-soon" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
        <Route path="/admin/bans" element={<AdminBans />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <AppContent />
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
