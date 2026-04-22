import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Crown, Zap } from "lucide-react";
import { getSubscriptionPlans, type SubscriptionPlan } from "@/lib/subscription";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan?: SubscriptionPlan | null;
}

export const SubscriptionModal = ({ open, onOpenChange, currentPlan }: SubscriptionModalProps) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      loadPlans();
    }
  }, [open]);

  const loadPlans = async () => {
    const planData = await getSubscriptionPlans();
    setPlans(planData);
  };

  const handleUpgrade = () => {
    // Route to the subscription page which handles Stripe checkout / Apple IAP
    onOpenChange(false);
    navigate('/subscription');
  };

  const getPlanIcon = (planName: string) => {
    if (planName === 'free') return <Zap className="w-5 h-5 text-primary" />;
    if (planName === 'basic') return <Star className="w-5 h-5 text-primary" />;
    if (planName === 'premium') return <Crown className="w-5 h-5 text-primary" />;
    return <Zap className="w-5 h-5 text-primary" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Make Reading Your Child's Favorite Activity</DialogTitle>
          <DialogDescription>
            Unlimited stories + reading progress tracking parents love. Starting at $4.99/month.
          </DialogDescription>
        </DialogHeader>

        {/* Value Comparison */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold mb-2">📊 Compare the Value:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="font-medium">Traditional Books:</span> $10-15 each, often unread
            </div>
            <div>
              <span className="font-medium">Other Apps:</span> $9.99+ without personalization
            </div>
            <div>
              <span className="font-medium text-primary">StoryMaster Kids:</span> $4.99/mo = unlimited interactive stories
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.name === 'premium' ? 'ring-2 ring-primary border-primary' : ''} ${currentPlan?.id === plan.id ? 'bg-muted' : ''}`}
            >
              {plan.name === 'premium' && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.name)}
                </div>
                <CardTitle className="text-xl capitalize">{plan.name === 'premium' ? 'Adventure Pass' : plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    ${plan.price_monthly}
                  </span>
                  {plan.price_monthly > 0 && <span className="text-sm">/month</span>}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">
                      {plan.name === 'free' || plan.name === 'basic'
                        ? "3 stories per month" 
                        : "Unlimited stories per month"}
                    </span>
                  </li>
                  {plan.name === 'free' && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">Basic progress tracking</span>
                    </li>
                  )}
                  {plan.features.daily_stories === -1 && (
                    <>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">🎧 Read-to-Me AI narration</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm font-semibold">📊 Parent Reading Analytics</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">Reading time & word count tracking</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">Weekly progress reports</span>
                      </li>
                    </>
                  )}
                  {plan.features.premium_characters && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">Premium character types</span>
                    </li>
                  )}
                  {plan.features.squad_missions && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">Squad missions & multiplayer</span>
                    </li>
                  )}
                  {plan.features.priority_support && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">Priority support</span>
                    </li>
                  )}
                  {plan.features.early_access && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">Early access to new features</span>
                    </li>
                  )}
                  {plan.features.custom_avatars && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">Custom avatar creation</span>
                    </li>
                  )}
                </ul>
                
                <Button 
                  className="w-full"
                  variant={plan.name === 'premium' ? 'default' : 'outline'}
                  disabled={currentPlan?.id === plan.id}
                  onClick={() => handleUpgrade()}
                >
                  {currentPlan?.id === plan.id ? 'Current Plan' : 
                   plan.price_monthly > 0 ? 'Subscribe' : 'Current Plan'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
