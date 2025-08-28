import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Crown, Zap } from "lucide-react";
import { getSubscriptionPlans, upgradeSubscription, type SubscriptionPlan } from "@/lib/subscription";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan?: SubscriptionPlan | null;
}

export const SubscriptionModal = ({ open, onOpenChange, currentPlan }: SubscriptionModalProps) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadPlans();
    }
  }, [open]);

  const loadPlans = async () => {
    const planData = await getSubscriptionPlans();
    setPlans(planData);
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    const success = await upgradeSubscription(planId);
    
    if (success) {
      toast({
        title: "Subscription Updated!",
        description: "Your subscription has been upgraded successfully.",
      });
      onOpenChange(false);
    } else {
      toast({
        title: "Upgrade Failed",
        description: "Unable to upgrade subscription. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
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
          <DialogTitle className="text-2xl">Choose Your Adventure Level</DialogTitle>
          <DialogDescription>
            Upgrade your storytelling experience with unlimited stories and premium features
          </DialogDescription>
        </DialogHeader>
        
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
                <CardTitle className="text-xl capitalize">{plan.name}</CardTitle>
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
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm">
                      {plan.features.daily_stories === -1 
                        ? "Unlimited daily stories" 
                        : `${plan.features.daily_stories} stories per day`}
                    </span>
                  </li>
                  {plan.features.premium_characters && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm">Premium character types</span>
                    </li>
                  )}
                  {plan.features.squad_missions && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm">Squad missions & multiplayer</span>
                    </li>
                  )}
                  {plan.features.priority_support && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm">Priority support</span>
                    </li>
                  )}
                  {plan.features.early_access && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm">Early access to new features</span>
                    </li>
                  )}
                  {plan.features.custom_avatars && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm">Custom avatar creation</span>
                    </li>
                  )}
                </ul>
                
                <Button 
                  className="w-full"
                  variant={plan.name === 'premium' ? 'default' : 'outline'}
                  disabled={loading || currentPlan?.id === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {currentPlan?.id === plan.id ? 'Current Plan' : 
                   plan.name === 'free' ? 'Downgrade' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};