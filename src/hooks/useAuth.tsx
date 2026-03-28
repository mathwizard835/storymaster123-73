import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    // Auth setup for all platforms (web and mobile)
    const authTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Check for email verification in both URL params and hash
    const checkEmailVerification = () => {
      // Check URL params
      const urlParams = new URLSearchParams(window.location.search);
      const type = urlParams.get('type');
      
      // Check URL hash (Supabase often returns tokens in hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashType = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      // If we have a signup confirmation
      if ((type === 'signup' || hashType === 'signup') && accessToken) {
        import('@/hooks/use-toast').then(({ toast }) => {
          toast({
            title: "Email verified successfully!",
            description: "Welcome to StoryMaster!",
          });
        });
        
        // Clean up URL and redirect to dashboard
        setTimeout(() => {
          window.history.replaceState({}, document.title, '/dashboard');
          window.location.href = '/dashboard';
        }, 500);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(authTimeout);
        
        // Handle email verification events
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          checkEmailVerification();
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
        // Identify user with RevenueCat on sign in
        if (event === 'SIGNED_IN' && session?.user) {
          import('@/lib/iapService').then(({ identifyUser }) => {
            identifyUser(session.user.id);
          });
        }
        
        // Handle sign out - clear state
        if (event === 'SIGNED_OUT') {
          console.log('Session ended, clearing state');
          setSession(null);
          setUser(null);
          // Clear any stale tokens
          localStorage.removeItem('supabase.auth.token');
          // Logout from RevenueCat
          import('@/lib/iapService').then(({ logOutRevenueCat }) => {
            logOutRevenueCat();
          });
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(authTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check if this is an email verification callback
      if (session) {
        checkEmailVerification();
      }
    });

    return () => {
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Clear subscription cache
    const { clearSubscriptionCache } = await import('@/lib/subscriptionSync');
    clearSubscriptionCache();
    
    // Reset premium theme to default
    localStorage.removeItem("premium-theme");
    document.documentElement.removeAttribute("data-theme");
    
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