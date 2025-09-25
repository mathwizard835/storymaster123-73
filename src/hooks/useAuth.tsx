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
    // Mobile-specific initialization - prevent external auth redirects
    if (isMobilePlatform()) {
      // Clear any existing URL parameters that might cause redirects
      if (window.location.search) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle email verification success
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          // Check if this is from email verification by looking at URL params
          const urlParams = new URLSearchParams(window.location.search);
          const isFromVerification = urlParams.has('type') && urlParams.get('type') === 'signup';
          
          if (isFromVerification && !isMobilePlatform()) { // Only show for web users
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

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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