import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, lazy, Suspense } from "react";
import { initializeRevenueCat } from "@/lib/iapService";
import { initDeepLinkHandler } from "@/lib/deepLinkHandler";
import { initPushNotifications } from "@/lib/pushNotifications";
import { requestNotificationPermission, scheduleStreakReminder, scheduleRetentionNotification } from "@/lib/localNotifications";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { NativeLoadingScreen } from "@/components/NativeLoadingScreen";
import { Capacitor } from "@capacitor/core";
import ErrorBoundary from "./components/ErrorBoundary";

// Eager: guest home + auth (critical path — story-first flow)
import GuestHome from "./pages/GuestHome";
import GuestStory from "./pages/GuestStory";
import Auth from "./pages/Auth";

// Lazy: everything else
const Index = lazy(() => import("./pages/Index"));
const PostSignupInterests = lazy(() => import("./pages/PostSignupInterests"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const Mission = lazy(() => import("./pages/Mission"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const StoryGallery = lazy(() => import("./pages/StoryGallery"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Support = lazy(() => import("./pages/Support"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const Settings = lazy(() => import("./pages/Settings"));
const SharedStory = lazy(() => import("./pages/SharedStory"));

const queryClient = new QueryClient();
const isNative = Capacitor.isNativePlatform();

// Story-first: every visitor (web + native, signed-in or not) lands on GuestHome.
// The 3 story cards ARE the onboarding. No marketing wall, no welcome screen.

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <NativeLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <NativeLoadingScreen />;
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

const LazyFallback = () => <NativeLoadingScreen />;

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <Suspense fallback={<LazyFallback />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={<PublicRoute><PageTransition><Auth /></PageTransition></PublicRoute>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/" element={<GuestHome />} />
          <Route path="/story/:slug" element={<GuestStory />} />
          <Route path="/about" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/post-signup" element={<ProtectedRoute><PageTransition><PostSignupInterests /></PageTransition></ProtectedRoute>} />
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
          <Route path="/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
          <Route path="/shared/:storyId" element={<PageTransition><SharedStory /></PageTransition>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

const App = () => {
  // Load saved theme and initialize RevenueCat on app mount
  useEffect(() => {
    // Lightweight: capture inbound story-share param so we can route into it later
    try {
      const params = new URLSearchParams(window.location.search);
      const refStory = params.get('ref_story');
      if (refStory) {
        localStorage.setItem('pending_ref_story', refStory);
      }
    } catch (e) {
      // ignore
    }

    const savedTheme = localStorage.getItem("premium-theme");
    if (savedTheme && savedTheme !== "default") {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    // Add native-app class for Capacitor-specific CSS
    if (isNative) {
      document.documentElement.classList.add('native-app');
    }

    // Initialize RevenueCat for native IAP
    initializeRevenueCat();
    
    // Initialize push notifications for native
    initPushNotifications();

    // Request local notification permission and schedule reminders
    if (isNative) {
      requestNotificationPermission().then((granted) => {
        if (granted) {
          scheduleStreakReminder();
          scheduleRetentionNotification();
        }
      });
    }
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
