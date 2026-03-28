import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, BookOpen, KeyRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { passwordSchema } from '@/lib/validationSchemas';
import heroPortal from '@/assets/hero-portal.jpg';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check URL params for invite flow
    const urlParams = new URLSearchParams(window.location.search);
    const queryType = urlParams.get('type');
    
    if (queryType === 'invite') {
      setIsInviteFlow(true);
      console.log('User arrived from invitation link');
      return;
    }
    
    // Check if user came from reset password email link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    // Handle invite in hash (direct from Supabase email)
    if (accessToken && type === 'invite') {
      setIsInviteFlow(true);
      console.log('Valid invitation token detected');
      return;
    }
    
    // Handle the recovery token - Supabase will auto-login user with the token
    if (accessToken && type === 'recovery') {
      // User has valid recovery token, they can reset password
      console.log('Valid password recovery token detected');
      return;
    }
    
    // Also check URL params for recovery (some Supabase versions use query params)
    const queryToken = urlParams.get('token');
    
    if (queryToken && queryType === 'recovery') {
      console.log('Valid password recovery token in query params');
      return;
    }
    
    // Check if user is already authenticated (came from a valid link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !accessToken) {
        toast({
          title: "Invalid or expired link",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate('/auth');
      }
    });
  }, [navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Validate password strength
      const validationResult = passwordSchema.safeParse(password);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(err => err.message).join('. ');
        setError(errors);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: validationResult.data,
      });

      if (error) {
        setError(error.message);
      } else {
        toast({
          title: "Password updated!",
          description: "Your password has been successfully reset. You can now sign in with your new password.",
        });
        navigate('/dashboard');
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
            <h1 className="text-3xl font-bold text-white">StoryMaster</h1>
          </div>
          <p className="text-purple-200">Reset your password to continue your adventure</p>
        </div>

        <Card className="bg-black/20 backdrop-blur-md border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <KeyRound className="h-5 w-5 text-purple-400" />
              {isInviteFlow ? 'Set Your Password' : 'Set New Password'}
            </CardTitle>
            <CardDescription className="text-purple-200">
              {isInviteFlow 
                ? 'Create a password to complete your account setup' 
                : 'Choose a strong password for your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-white">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
                  placeholder="Confirm new password"
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
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/auth')}
            className="text-purple-200 hover:text-white hover:bg-white/10"
          >
            ← Back to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
