import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isMobilePlatform } from '@/lib/mobileFeatures';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AUTH] Initializing auth system...');
    console.log('[AUTH] User agent:', navigator.userAgent);
    console.log('[AUTH] Capacitor exists:', !!(typeof window !== 'undefined' && (window as any).Capacitor));
    
    const isMobile = isMobilePlatform();
    console.log('[AUTH] Mobile platform detected:', isMobile);
    
    // CRITICAL: Mobile-first bypass - prevent ANY external redirects
    if (isMobile) {
      console.log('[AUTH] Mobile detected - bypassing all Supabase auth');
      
      // Clear any URL parameters that could trigger redirects
      if (window.location.search) {
        console.log('[AUTH] Cleaning URL parameters');
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // Set loading to false immediately - no auth needed on mobile
      console.log('[AUTH] ✓ Mobile auth bypass complete');
      setLoading(false);
      return;
    }

    // Web-only auth setup
    console.log('[AUTH] Web platform - setting up Supabase auth');
    
    // Timeout fallback to prevent infinite loading
    const authTimeout = setTimeout(() => {
      console.log('[AUTH] ⚠️ Auth initialization timeout - forcing ready state');
      setLoading(false);
    }, 3000);

    // Set up auth state listener FIRST (web only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH] Auth state change:', event);
        clearTimeout(authTimeout);
        
        // Handle email verification success
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          // Check if this is from email verification by looking at URL params
          const urlParams = new URLSearchParams(window.location.search);
          const isFromVerification = urlParams.has('type') && urlParams.get('type') === 'signup';
          
          if (isFromVerification) {
            // Show success message
            import('@/hooks/use-toast').then(({ toast }) => {
              toast({
                title: "Email verified successfully!",
                description: "Welcome to StoryMaster Quest! Your adventure awaits.",
              });
            });
            
            // Clean up URL
            window.history.replaceState({}, document.title, '/');
          }
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session (web only)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH] Initial session check:', session ? 'Session found' : 'No session');
      clearTimeout(authTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}