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
import { startForegroundTracking, stopForegroundTracking } from "@/lib/sessionTracker";

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
//
// Robustness rules:
//  - We cache the last known sub status per user in localStorage. If a check
//    fails (network blip, cold start), we fall back to the cache when it was
//    "active" within the last 24 hours so paying users aren't paywalled by a
//    transient failure.
//  - We re-run the check on tab visibility AND on a global
//    `subscription-refreshed` event (dispatched by purchase / cancel flows)
//    so the gate updates immediately after the user pays.
const SUB_CACHE_PREFIX = 'smq.sub.known.';
const SUB_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CachedSub = { active: boolean; at: number };

const readCachedSub = (userId: string): CachedSub | null => {
  try {
    const raw = localStorage.getItem(SUB_CACHE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSub;
    if (!parsed || typeof parsed.active !== 'boolean' || typeof parsed.at !== 'number') return null;
    return parsed;
  } catch { return null; }
};

const writeCachedSub = (userId: string, active: boolean) => {
  try {
    // Only cache POSITIVE entitlement. Caching `false` would poison the
    // fail-open fallback: a single bad check (e.g. race right after purchase)
    // would persist and paywall the user on the next network error.
    if (active) {
      localStorage.setItem(SUB_CACHE_PREFIX + userId, JSON.stringify({ active: true, at: Date.now() }));
    } else {
      localStorage.removeItem(SUB_CACHE_PREFIX + userId);
    }
  } catch { /* ignore */ }
};

const RequireSubscription = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasSub, setHasSub] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const runCheck = async (allowRetry = true) => {
      if (!user || !isNativePlatform()) {
        if (!cancelled) {
          setHasSub(true);
          setChecking(false);
        }
        return;
      }
      try {
        const { getUserSubscription } = await import("@/lib/subscription");
        const { plan } = await getUserSubscription(user.id);
        const active = !!plan && plan.name?.toLowerCase() !== 'free';

        // Cold-start race: first check after sign-in can return no rows
        // before the session is fully propagated. Retry twice silently
        // before paywalling a potentially paying user.
        if (!active && allowRetry) {
          await new Promise(r => setTimeout(r, 600));
          if (cancelled) return;
          const { plan: plan2 } = await getUserSubscription(user.id);
          const active2 = !!plan2 && plan2.name?.toLowerCase() !== 'free';
          if (active2) {
            if (!cancelled) { setHasSub(true); setChecking(false); }
            writeCachedSub(user.id, true);
            return;
          }
          await new Promise(r => setTimeout(r, 900));
          if (cancelled) return;
          return runCheck(false);
        }

        if (!cancelled) {
          setHasSub(active);
          setChecking(false);
        }
        writeCachedSub(user.id, active);

      } catch (e) {
        // Fail-open ONLY if we recently knew the user was subscribed —
        // this prevents transient network errors from paywalling a paying user.
        const cached = readCachedSub(user.id);
        const recentlyActive = !!cached && cached.active && (Date.now() - cached.at) < SUB_CACHE_TTL_MS;
        if (!cancelled) {
          setHasSub(recentlyActive);
          setChecking(false);
        }
        console.warn('[RequireSubscription] check failed, using cache', { recentlyActive, error: e });
      }
    };

    // Wait for auth to settle before the first check so the RLS-protected
    // user_subscriptions query has a valid session attached.
    if (authLoading) {
      setChecking(true);
      return;
    }

    setChecking(true);
    runCheck();

    // Listen for purchase / cancel events and visibility changes
    const onRefresh = () => { runCheck(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') runCheck();
    };
    window.addEventListener('subscription-refreshed', onRefresh);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('subscription-refreshed', onRefresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id, authLoading]);

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
  
  // Allow email verification / password reset callbacks to complete before redirecting.
  // Supabase may deliver tokens in either the URL hash or the query string.
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);
  const type = hashParams.get('type') || queryParams.get('type');
  const isAuthCallback =
    type === 'signup' ||
    type === 'recovery' ||
    type === 'invite' ||
    type === 'magiclink' ||
    hashParams.has('access_token') ||
    queryParams.has('code') ||
    queryParams.has('token_hash');

  if (isNativePlatform() && user && !isAuthCallback) {
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

// Starts/stops the real foreground session timer whenever the auth user changes.
const ForegroundSessionTracker = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    startForegroundTracking(user.id);
    return () => {
      stopForegroundTracking();
    };
  }, [user?.id]);
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
              <ForegroundSessionTracker />
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
