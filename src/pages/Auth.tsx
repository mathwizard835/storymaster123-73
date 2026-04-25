import { useState, useEffect } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, BookOpen, Stars } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { signInSchema, signUpSchema, type SignInFormData, type SignUpFormData } from '@/lib/validationSchemas';
import { checkIfBanned } from '@/lib/banCheck';
import heroPortal from '@/assets/hero-portal.jpg';
import AgeGateForm from '@/components/auth/AgeGateForm';
import ParentalConsentForm from '@/components/auth/ParentalConsentForm';
import ParentalGateChallenge from '@/components/auth/ParentalGateChallenge';
import { getAuthRedirectUrl } from '@/lib/authRedirect';

const NATIVE_AUTH_URL = 'storymasterquest://auth';

const isNativeApp = () => !!(window as any).Capacitor?.isNativePlatform?.();

const buildNativeAuthUrl = (params: Record<string, string | null | undefined>) => {
  const nativeParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) nativeParams.set(key, value);
  });

  const query = nativeParams.toString();
  return query ? `${NATIVE_AUTH_URL}?${query}` : NATIVE_AUTH_URL;
};

type SignupStep = 'credentials' | 'age-gate' | 'parental-gate' | 'parental-consent';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [signupStep, setSignupStep] = useState<SignupStep>('credentials');
  const [childAge, setChildAge] = useState<number>(0);
  const [appHandoffUrl, setAppHandoffUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);

      const type = hashParams.get('type') || queryParams.get('type');
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const tokenHash = hashParams.get('token_hash') || queryParams.get('token_hash');
      const code = queryParams.get('code');

      const supportedOtpTypes: EmailOtpType[] = ['signup', 'recovery', 'invite', 'email_change', 'magiclink'];
      const isSupportedOtpType = (value: string | null): value is EmailOtpType =>
        !!value && supportedOtpTypes.includes(value as EmailOtpType);

      if (!(accessToken && refreshToken) && !(tokenHash && isSupportedOtpType(type)) && !code) {
        return;
      }

      const isInNativeApp = isNativeApp();

      // Try handing off auth callback to native app first for browser-opened email links.
      if (!isInNativeApp) {
        const handoffUrl = buildNativeAuthUrl({ access_token: accessToken, refresh_token: refreshToken, token_hash: tokenHash, type, code });

        // Surface a tap-to-open button so the user can manually launch the app
        // if the browser blocks automatic custom-scheme redirects.
        setAppHandoffUrl(handoffUrl);

        window.location.href = handoffUrl;

        // Give the OS a moment to switch to native app before running browser fallback.
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      try {
        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) throw setSessionError;
        } else if (tokenHash && isSupportedOtpType(type)) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          });

          if (verifyError) throw verifyError;
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        if (type === 'invite') {
          toast({
            title: "Welcome!",
            description: "Please set your password to complete your account setup.",
          });
          navigate('/reset-password?type=invite');
          return;
        }

        if (type === 'recovery') {
          navigate('/reset-password');
          return;
        }

        toast({
          title: "Email verified!",
          description: "Redirecting to your dashboard...",
        });
        navigate('/dashboard');
      } catch (callbackError) {
        console.error('[Auth] Failed to process auth callback:', callbackError);
      }
    };

    checkUser();
    handleAuthCallback();
  }, [navigate, toast]);

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    if (resendCooldown > 0) {
      setError(`Please wait ${resendCooldown} seconds before resending`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const redirectUrl = getAuthRedirectUrl('/auth');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('60 seconds')) {
          setError('Email already sent. Please wait 60 seconds before requesting again.');
          setResendCooldown(60);
        } else if (error.message.includes('already confirmed')) {
          setError('This email is already verified. Please sign in instead.');
        } else {
          setError(error.message);
        }
      } else {
        setResendCooldown(60);
        toast({
          title: "Verification email sent!",
          description: "Check your inbox and spam folder. Email may take 1-2 minutes to arrive.",
          duration: 8000,
        });
      }
    } catch (err: any) {
      setError('Failed to resend email. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Validate credentials, then go to age gate
  const handleSignUpCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationResult = signUpSchema.safeParse({ email, password });
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => err.message).join('. ');
      setError(errors);
      return;
    }

    const { isBanned, reason } = await checkIfBanned(validationResult.data.email);
    if (isBanned) {
      setError(reason || 'This account has been suspended and cannot be used.');
      return;
    }

    // Go to age gate first
    setSignupStep('age-gate');
  };

  // Step 2: Age confirmed
  const handleAgeConfirmed = (age: number) => {
    setChildAge(age);
    // Always require parental gate challenge to verify adult is present
    setSignupStep('parental-gate');
  };

  // Step 3 (if under 13): Parental consent given
  const handleParentalConsent = (parentEmail: string) => {
    completeSignUp(childAge, parentEmail);
  };

  // Final: Create the account
  const completeSignUp = async (age: number, parentEmail: string | null) => {
    setLoading(true);
    setError('');

    try {
      const redirectUrl = getAuthRedirectUrl('/auth');

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            child_age: age,
            parent_email: parentEmail,
            parental_consent_given: age < 13 ? true : null,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else if (signUpError.message.includes('rate limit')) {
          setError('Too many signup attempts. Please wait a few minutes before trying again.');
        } else {
          setError(`Signup failed: ${signUpError.message}`);
        }
        return;
      }

      // Update profile with consent info
      if (data?.user) {
        await supabase
          .from('profiles')
          .update({
            child_age: age,
            parent_email: parentEmail,
            parental_consent_given: age < 13,
            parental_consent_at: age < 13 ? new Date().toISOString() : null,
            parental_consent_method: age < 13 ? 'email_verification' : null,
          })
          .eq('id', data.user.id);
      }

      if (data?.user && !data.session) {
        toast({
          title: "Check your email to confirm your account!",
          description: parentEmail
            ? "We've sent confirmation emails to both you and your parent/guardian. Click the link in the email to activate your account. Check your spam folder if it doesn't arrive within a few minutes."
            : "We sent a confirmation link to your email. Click it to activate your account. Check your spam folder if it doesn't arrive within a few minutes.",
          duration: 10000,
        });
        setSignupStep('credentials');
      } else if (data?.session) {
        if (!isNativeApp()) {
          const handoffUrl = buildNativeAuthUrl({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            type: 'signup',
          });
          setAppHandoffUrl(handoffUrl);
          window.location.href = handoffUrl;
          return;
        }

        toast({
          title: "Account created successfully!",
          description: "You can now start your adventure.",
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validationResult = signInSchema.safeParse({ email, password });
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err => err.message).join('. ');
        setError(errors);
        setLoading(false);
        return;
      }

      const { isBanned, reason } = await checkIfBanned(validationResult.data.email);
      if (isBanned) {
        setError(reason || 'This account has been suspended.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validationResult.data.email,
        password: validationResult.data.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.');
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: "Welcome back!",
          description: isNativeApp() ? "You've successfully signed in." : "Opening StoryMaster Kids...",
        });

        if (!isNativeApp() && data.session) {
          const handoffUrl = buildNativeAuthUrl({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            type: 'magiclink',
          });
          setAppHandoffUrl(handoffUrl);
          window.location.href = handoffUrl;
          return;
        }

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }
      if (resetCooldown > 0) {
        setError(`Please wait ${resetCooldown} seconds before requesting again`);
        setLoading(false);
        return;
      }

      const redirectUrl = getAuthRedirectUrl('/reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('60 seconds')) {
          setError('Reset email already sent. Please wait 60 seconds before requesting again.');
          setResetCooldown(60);
        } else {
          setError(error.message);
        }
      } else {
        setResetCooldown(60);
        toast({
          title: "Reset email sent!",
          description: "Check your inbox and spam folder. Email may take 1-2 minutes to arrive.",
          duration: 8000,
        });
        setShowForgotPassword(false);
      }
    } catch (err: any) {
      setError('Failed to send reset email. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Render signup step content
  const renderSignupContent = () => {
    if (signupStep === 'age-gate') {
      return (
        <AgeGateForm
          onAgeConfirmed={handleAgeConfirmed}
          onBack={() => setSignupStep('credentials')}
          loading={loading}
          externalError={error}
        />
      );
    }

    if (signupStep === 'parental-gate') {
      return (
        <ParentalGateChallenge
          onPassed={() => {
            if (childAge <= 12) {
              setSignupStep('parental-consent');
            } else {
              completeSignUp(childAge, null);
            }
          }}
          onBack={() => setSignupStep('age-gate')}
        />
      );
    }

    if (signupStep === 'parental-consent') {
      return (
        <ParentalConsentForm
          childAge={childAge}
          onConsent={handleParentalConsent}
          onBack={() => setSignupStep('age-gate')}
          loading={loading}
          externalError={error}
        />
      );
    }

    // Default: credentials form
    return (
      <Tabs defaultValue="signup" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-black/30">
          <TabsTrigger value="signup" className="text-white data-[state=active]:bg-purple-600">
            Sign Up
          </TabsTrigger>
          <TabsTrigger value="login" className="text-white data-[state=active]:bg-purple-600">
            Log In
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="login" className="space-y-4 mt-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-white">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-white">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
                placeholder="Enter your password"
              />
            </div>
            
            {error && (
              <Alert className="bg-red-900/50 border-red-500/50 text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log In
            </Button>
            
            <div className="text-center">
              <Button 
                type="button"
                variant="link"
                onClick={() => setShowForgotPassword(true)}
                className="text-purple-200 hover:text-white text-sm"
              >
                Forgot password?
              </Button>
            </div>
          </form>
        </TabsContent>
        
        <TabsContent value="signup" className="space-y-4 mt-6">
          <form onSubmit={handleSignUpCredentials} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-white">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-white">Password</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
                placeholder="Create a password (min 6 characters)"
              />
            </div>
            
            {error && (
              <Alert className="bg-red-900/50 border-red-500/50 text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
            
            <div className="text-center">
              <Button 
                type="button"
                variant="ghost"
                onClick={handleResendVerification}
                disabled={loading || !email}
                className="text-purple-200 hover:text-white text-sm"
              >
                Didn't receive email? Resend verification
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4"
      style={{ backgroundImage: `url(${heroPortal})` }}
    >
      <div className="absolute inset-0 bg-black/60"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">StoryMaster Kids</h1>
          </div>
          <p className="text-purple-200">Interactive stories that make kids love reading</p>
          <p className="text-purple-300 text-sm mt-2">AI-powered adventures adapted to your child's reading level</p>
        </div>

        <Card className="bg-black/20 backdrop-blur-md border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <Stars className="h-5 w-5 text-yellow-400" />
              {signupStep === 'age-gate' ? 'Age Verification' : 
               signupStep === 'parental-consent' ? 'Parental Consent' : 'Get Started'}
            </CardTitle>
            <CardDescription className="text-purple-200">
              {signupStep === 'age-gate' ? 'Tell us how old you are' :
               signupStep === 'parental-consent' ? 'A parent or guardian must approve' :
               'Create a free account to begin your adventure'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appHandoffUrl && (
              <div className="mb-6 p-4 rounded-lg bg-purple-600/30 border border-purple-400/40 text-center space-y-3">
                <p className="text-white text-sm font-medium">
                  ✅ Email confirmed! Open StoryMaster Kids to continue.
                </p>
                <a
                  href={appHandoffUrl}
                  className="inline-block w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  Open in App
                </a>
                <p className="text-purple-200 text-xs">
                  If the app doesn't open automatically, tap the button above.
                </p>
              </div>
            )}
            {showForgotPassword ? (
              <div className="space-y-4">
                <Button 
                  variant="ghost"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-purple-200 hover:text-white mb-2"
                >
                  ← Back to Log In
                </Button>
                
                <div className="text-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Reset Password</h3>
                  <p className="text-purple-200 text-sm mt-2">Enter your email to receive a password reset link</p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-white">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  {error && (
                    <Alert className="bg-red-900/50 border-red-500/50 text-red-200">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-purple-600 hover:bg-purple-700" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              </div>
            ) : (
              renderSignupContent()
            )}
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-purple-200 hover:text-white hover:bg-white/10"
          >
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
