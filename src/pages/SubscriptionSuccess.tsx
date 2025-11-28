import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserSubscription } from "@/lib/subscription";
import { supabase } from "@/integrations/supabase/client";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isVerifying, setIsVerifying] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);

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
              title: "🎉 Welcome to Premium!",
              description: "Your subscription is now active. Enjoy unlimited stories!",
            });
          } else {
            setIsVerifying(false);
            toast({
              title: "Subscription Activated",
              description: "Your premium access is ready! Reload the page if needed.",
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
              Your premium subscription is now active
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-primary/5 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              What's Next?
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Access unlimited interactive stories every month</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Unlock all story modes and premium features</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Track your child's reading progress</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Enjoy priority support from our team</span>
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
                'Go to Dashboard'
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
            <a href="mailto:support@storymasterquest.com" className="text-primary hover:underline">
              support@storymasterquest.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
