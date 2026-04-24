import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, Loader2, Volume2, BookOpen, Star, Headphones } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserSubscription } from "@/lib/subscription";
import { supabase } from "@/integrations/supabase/client";
import ParentalGateDialog from "@/components/ParentalGateDialog";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isVerifying, setIsVerifying] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    let hasRun = false;
    
    const verifyAndActivate = async () => {
      if (!sessionId || hasRun) return;
      hasRun = true;

      try {
        console.log('Verifying checkout session:', sessionId);
        
        const { data, error } = await supabase.functions.invoke('verify-checkout-session', {
          body: { sessionId },
        });

        if (error) {
          console.error('Error verifying session:', error);
          throw error;
        }

        if (data.success) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const { subscription } = await getUserSubscription();
          
          if (subscription?.status === 'active') {
            setSubscriptionActive(true);
            setIsVerifying(false);
            toast({
              title: "🎉 Welcome to Adventure Pass!",
              description: "Your subscription is now active. Enjoy stories your child will want to come back to every day and Read-to-Me!",
            });
          } else {
            setIsVerifying(false);
            toast({
              title: "Subscription Activated",
              description: "Your Adventure Pass is ready! Reload the page if needed.",
            });
          }
        } else {
          throw new Error('Failed to verify checkout session');
        }
      } catch (error) {
        console.error('Error in verification flow:', error);
        setIsVerifying(false);
        toast({
          title: "Verification Error",
          description: "Please contact support if your subscription doesn't appear.",
          variant: "destructive",
        });
      }
    };

    verifyAndActivate();
  }, [sessionId, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-primary/20 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Payment Successful!
            </CardTitle>
            <CardDescription className="text-base">
              Your Adventure Pass is now active — $4.99/month
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Read-to-Me highlight */}
          <div className="relative bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 rounded-xl p-5 border border-purple-400/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">🎧 Read-to-Me AI Narration</h3>
                <p className="text-sm text-muted-foreground">Every story can now be read aloud with AI-powered voices</p>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Your Adventure Pass includes:
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Stories your child will want to come back to every day</span>
              </li>
              <li className="flex items-start gap-2">
                <Volume2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Read-to-Me AI narration on all stories</span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>All story modes and premium features unlocked</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Track your child's reading progress</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Priority support from our team</span>
              </li>
            </ul>
          </div>

          {isVerifying && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
              <p className="text-sm text-yellow-500">
                Activating your subscription... This may take a few moments.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="flex-1"
              size="lg"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                'Start Reading!'
              )}
            </Button>
            <Button 
              onClick={() => navigate('/subscription')}
              variant="outline"
              className="flex-1"
              size="lg"
              disabled={isVerifying}
            >
              View Subscription
            </Button>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Questions? Contact us at{" "}
            <button
              type="button"
              onClick={() => setGateOpen(true)}
              className="text-primary hover:underline"
            >
              support@storymasterkids.com
            </button>
          </p>
        </CardContent>
      </Card>

      <ParentalGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        onPassed={() => { window.location.href = 'mailto:support@storymasterkids.com'; }}
        title="Grown-Up Check"
        description="Please ask a parent or guardian to verify before opening your email app."
      />
    </div>
  );
}