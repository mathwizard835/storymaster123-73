import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Crown, Zap } from "lucide-react";
import { getStoriesRemaining, getUserSubscription } from "@/lib/subscription";
import { SubscriptionModal } from "@/components/SubscriptionModal";

export const StoryLimitWidget = () => {
  const [storyData, setStoryData] = useState({
    storiesUsedThisMonth: 0,
    monthlyLimit: 3,
    bonusStories: 0,
    canPlay: true
  });
  const [subscription, setSubscription] = useState<any>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    loadStoryData();
    loadSubscription();
  }, []);

  const loadStoryData = async () => {
    const data = await getStoriesRemaining();
    setStoryData(data);
  };

  const loadSubscription = async () => {
    const { subscription, plan } = await getUserSubscription();
    setSubscription({ subscription, plan });
  };

  const totalAllowed = storyData.monthlyLimit + storyData.bonusStories;
  const usagePercent = (storyData.storiesUsedThisMonth / Math.max(totalAllowed, 1)) * 100;
  const remaining = Math.max(0, totalAllowed - storyData.storiesUsedThisMonth);

  const getPlanBadge = () => {
    if (!subscription?.plan) return <Badge variant="outline">Free</Badge>;
    
    const { plan } = subscription;
    if (plan.name === 'premium') {
      return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500"><Crown className="w-3 h-3 mr-1" />Premium</Badge>;
    }
    if (plan.name === 'basic') {
      return <Badge variant="default"><Zap className="w-3 h-3 mr-1" />Basic</Badge>;
    }
    return <Badge variant="outline">Free</Badge>;
  };

  const getTimeUntilReset = () => {
    // Rolling 30-day period - stories expire 30 days after they were used
    // Show approximate time when next story slot becomes available
    return "Rolling 30-day period";
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Monthly Stories
            </CardTitle>
            {getPlanBadge()}
          </div>
          <CardDescription>
            {storyData.canPlay ? 
              "Keep creating amazing stories!" : 
              "You've reached your monthly limit. Upgrade or wait for next month!"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Stories Used This Month</span>
              <span className="font-medium">
                {storyData.storiesUsedThisMonth}/{totalAllowed}
              </span>
            </div>
            <Progress 
              value={usagePercent} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {storyData.bonusStories > 0 && (
                  <span className="text-primary">+{storyData.bonusStories} bonus</span>
                )}
              </span>
              <span>{remaining} remaining</span>
            </div>
          </div>

          {!storyData.canPlay && (
            <div className="bg-muted p-3 rounded-lg text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm font-medium">Story limit reached</div>
              <div className="text-xs text-muted-foreground mt-1">
                Stories reset on a rolling 30-day basis
              </div>
            </div>
          )}

          {(!subscription?.plan || subscription?.plan?.name === 'free') && (
            <Button 
              onClick={() => setShowUpgrade(true)}
              className="w-full"
              variant={storyData.canPlay ? "outline" : "default"}
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade for 10 Stories/Month
            </Button>
          )}

          {subscription?.plan && subscription.plan.name !== 'free' && (
            <div className="text-center text-sm text-muted-foreground">
              Enjoying {subscription.plan.name === 'premium' || subscription.plan.name === 'premium_plus' ? '10' : subscription.plan.features.daily_stories} monthly stories
            </div>
          )}
        </CardContent>
      </Card>

      <SubscriptionModal 
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={subscription?.plan}
      />
    </>
  );
};