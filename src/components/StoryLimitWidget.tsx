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
    storiesUsedToday: 0,
    dailyLimit: 1,
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

  const totalAllowed = storyData.dailyLimit + storyData.bonusStories;
  const usagePercent = (storyData.storiesUsedToday / Math.max(totalAllowed, 1)) * 100;
  const remaining = Math.max(0, totalAllowed - storyData.storiesUsedToday);

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
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Daily Stories
            </CardTitle>
            {getPlanBadge()}
          </div>
          <CardDescription>
            {storyData.canPlay ? 
              "Keep creating amazing stories!" : 
              "You've reached your daily limit. Upgrade or wait for tomorrow!"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Stories Used Today</span>
              <span className="font-medium">
                {storyData.storiesUsedToday}/{totalAllowed}
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
              <div className="text-sm font-medium">Next reset in {getTimeUntilReset()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Or upgrade for unlimited stories!
              </div>
            </div>
          )}

          {subscription?.plan?.name === 'free' && (
            <Button 
              onClick={() => setShowUpgrade(true)}
              className="w-full"
              variant={storyData.canPlay ? "outline" : "default"}
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade for Unlimited Stories
            </Button>
          )}

          {subscription?.plan && subscription.plan.name !== 'free' && (
            <div className="text-center text-sm text-muted-foreground">
              Enjoying {subscription.plan.features.daily_stories === -1 ? 'unlimited' : subscription.plan.features.daily_stories} daily stories
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