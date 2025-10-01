import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { isMobilePlatform } from '@/lib/mobileFeatures';
import heroPortal from '@/assets/hero-portal.jpg';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Mobile users should never see this auth page - redirect to home with trial mode
    if (isMobilePlatform()) {
      navigate('/?trial=true', { replace: true });
      return;
    }

    // Check if user is already logged in (web only)
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    
    checkUser();
  }, [navigate, toast]);

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    
    setLoading(true);
    try {
      const isNative = isMobilePlatform();
      const redirectUrl = isNative ? undefined : window.location.origin;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: redirectUrl ? {
          emailRedirectTo: redirectUrl
        } : undefined
      });
      
      if (error) {
        setError(error.message);
      } else {
        toast({
          title: "Email resent!",
          description: "Please check your email (including spam folder) for the verification link.",
        });
      }
    } catch (err: any) {
      setError('Failed to resend email');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate input data
      const validationResult = signUpSchema.safeParse({ email, password });
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err => err.message).join('. ');
        setError(errors);
        setLoading(false);
        return;
      }

      const isNative = isMobilePlatform();
      const redirectUrl = isNative ? undefined : window.location.origin;
      
      const { data, error } = await supabase.auth.signUp({
        email: validationResult.data.email,
        password: validationResult.data.password,
        options: redirectUrl ? {
          emailRedirectTo: redirectUrl
        } : undefined
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else if (error.message.includes('rate limit')) {
          setError('Too many signup attempts. Please wait a few minutes before trying again.');
        } else {
          setError(`Signup failed: ${error.message}`);
        }
      } else {
        if (data?.user && !data.session) {
          // User created but needs email verification
          toast({
            title: "Check your email!",
            description: "We sent you a verification link. Check your spam folder if you don't see it within a few minutes.",
            duration: 8000,
          });
          
          // Show a helpful message about common email issues
          setTimeout(() => {
            toast({
              title: "Email not received?",
              description: "Check your spam folder or try resending the verification email.",
              duration: 10000,
            });
          }, 10000);
        } else if (data?.session) {
          // User was automatically signed in (email confirmation disabled)
          toast({
            title: "Account created successfully!",
            description: "You can now start your adventure.",
          });
          navigate('/');
        }
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
      // Validate input data
      const validationResult = signInSchema.safeParse({ email, password });
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err => err.message).join('. ');
        setError(errors);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
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
          description: "You've successfully signed in.",
        });
        navigate('/');
      }
    } catch (err: any) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-3xl font-bold text-white">StoryMaster Quest</h1>
          </div>
          <p className="text-purple-200">Begin your adventure with personalized stories</p>
        </div>

        <Card className="bg-black/20 backdrop-blur-md border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <Stars className="h-5 w-5 text-yellow-400" />
              Join the Quest
            </CardTitle>
            <CardDescription className="text-purple-200">
              Sign in to save your progress and access your story library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/30">
                <TabsTrigger value="signin" className="text-white data-[state=active]:bg-purple-600">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-white data-[state=active]:bg-purple-600">
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-white">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-white">Password</Label>
                    <Input
                      id="signin-password"
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
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
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
                    Create Account
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