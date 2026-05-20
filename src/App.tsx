import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, lazy, Suspense, useState } from "react";
import { initializeRevenueCat } from "@/lib/iapService";
import { initDeepLinkHandler } from "@/lib/deepLinkHandler";
import { initPushNotifications } from "@/lib/pushNotifications";
import { requestNotificationPermission, scheduleStreakReminder, scheduleRetentionNotification } from "@/lib/localNotifications";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { NativeLoadingScreen } from "@/components/NativeLoadingScreen";
import { NativeOnboarding, hasSeenOnboarding } from "@/components/NativeOnboarding";
import ErrorBoundary from "./components/ErrorBoundary";
import { trackFunnelStep } from "@/lib/analytics";
import { isNativePlatform } from "@/lib/platform";

// Eager: landing + auth (critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NativeWelcome from "./pages/NativeWelcome";

// Lazy: everything else
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
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const TryStory = lazy(() => import("./pages/TryStory"));

const queryClient = new QueryClient();

// On native, show onboarding → welcome screen if not logged in, dashboard if logged in
const NativeHomeRedirect = () => {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (isNativePlatform()) {
      hasSeenOnboarding().then(seen => setShowOnboarding(!seen));
    } else {
      setShowOnboarding(false);
    }
  }, []);

  if (loading || showOnboarding === null) return <NativeLoadingScreen />;

  if (showOnboarding) {
    return <NativeOnboarding onComplete={() => setShowOnboarding(false)} />;
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return <NativeWelcome />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <NativeLoadingScreen />;
  }

  if (!user) {
    return <Navigate to={isNativePlatform() ? "/auth" : "/"} replace />;
  }

  return <>{children}</>;
};

// Native subscription gate: after auth, users without an active subscription are
// hard-routed to /subscription?required=true. Allowed routes: /subscription itself,
// /settings (so they can log out), /profile (initial setup), /support.
const RequireSubscription = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [hasSub, setHasSub] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user || !isNativePlatform()) {
        setChecking(false);
        setHasSub(true);
        return;
      }
      try {
        const { getUserSubscription } = await import("@/lib/subscription");
        const { plan } = await getUserSubscription();
        const active = !!plan && plan.name?.toLowerCase() !== 'free';
        if (!cancelled) {
          setHasSub(active);
          setChecking(false);
        }
      } catch {
        if (!cancelled) {
          setHasSub(false);
          setChecking(false);
        }
      }
    };
    check();
    return () => { cancelled = true; };
  }, [user, location.pathname]);

  if (checking) return <NativeLoadingScreen />;
  if (!hasSub) return <Navigate to="/subscription?required=true" replace />;
  return <>{children}</>;
};

const NativeAppRoute = ({ children }: { children: React.ReactNode }) => {
  // Authenticated app routes must not depend on platform detection after login.
  return (
    <ProtectedRoute>
      <RequireSubscription>{children}</RequireSubscription>
    </ProtectedRoute>
  );
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <NativeLoadingScreen />;
  }
  
  // Allow email verification callbacks to complete before redirecting
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const isEmailVerification = hashParams.get('type') === 'signup' || hashParams.get('type') === 'recovery';
  
  if (isNativePlatform() && user && !isEmailVerification) {
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
  const isNative = isNativePlatform();

  return (
    <Suspense fallback={<LazyFallback />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={<PublicRoute><PageTransition><Auth /></PageTransition></PublicRoute>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/" element={isNative ? <NativeHomeRedirect /> : <Index />} />
          <Route path="/profile" element={<NativeAppRoute><PageTransition><ProfileSetup /></PageTransition></NativeAppRoute>} />
          <Route path="/mission" element={<NativeAppRoute><Mission /></NativeAppRoute>} />
          <Route path="/gallery" element={<NativeAppRoute><PageTransition><StoryGallery /></PageTransition></NativeAppRoute>} />
          <Route path="/achievements" element={<NativeAppRoute><PageTransition><Achievements /></PageTransition></NativeAppRoute>} />
          <Route path="/dashboard" element={<NativeAppRoute><PageTransition><Dashboard /></PageTransition></NativeAppRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><PageTransition><Subscription /></PageTransition></ProtectedRoute>} />
          <Route path="/subscription/success" element={isNative ? <PageTransition><SubscriptionSuccess /></PageTransition> : <Navigate to="/" replace />} />
          <Route path="/coming-soon" element={<NativeAppRoute><PageTransition><ComingSoon /></PageTransition></NativeAppRoute>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
          <Route path="/support" element={<PageTransition><Support /></PageTransition>} />
          <Route path="/parent-dashboard" element={<NativeAppRoute><PageTransition><ParentDashboard /></PageTransition></NativeAppRoute>} />
          <Route path="/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
          <Route path="/shared/:storyId" element={<PageTransition><SharedStory /></PageTransition>} />
          <Route path="/admin/analytics" element={<NativeAppRoute><PageTransition><AdminAnalytics /></PageTransition></NativeAppRoute>} />
          <Route path="/try" element={<PageTransition><TryStory /></PageTransition>} />
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
    const isNative = isNativePlatform();

    // Funnel: top of the conversion funnel — fired once per analytics session.
    trackFunnelStep("app_opened");

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
