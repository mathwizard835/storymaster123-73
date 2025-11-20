import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      toast({
        title: "🎉 Welcome to Premium!",
        description: "Your subscription is now active. Enjoy unlimited stories!",
      });
    }
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

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="flex-1"
              size="lg"
            >
              Go to Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/subscription')}
              variant="outline"
              className="flex-1"
              size="lg"
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
