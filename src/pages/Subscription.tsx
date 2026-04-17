import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X, BookOpen, Star, Sparkles, Crown, ArrowLeft, Gamepad2, Apple, CreditCard, RotateCcw, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cancelSubscription, getUserSubscription, type SubscriptionPlan } from "@/lib/subscription";
import { 
  isNativePlatform, 
  isIOSPlatform,
  addBrowserCloseListener,
  pollForSubscriptionUpdate,
} from "@/lib/nativePayments";
import { purchasePackage, restorePurchases, getOfferings, activateSubscriptionAfterPurchase, type IAPPackage } from "@/lib/iapService";
import ParentalGateDialog from "@/components/ParentalGateDialog";

import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/story";

import { useDevice } from "@/contexts/DeviceContext";

export default function Subscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const limitReached = searchParams.get('limitReached') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';
  const packSuccess = searchParams.get('pack_success') === 'true';
  const packCancelled = searchParams.get('pack_cancelled') === 'true';
  const storiesPurchased = searchParams.get('stories');
  const { isNative, safeAreaInsets } = useDevice();

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  useEffect(() => {
    if (cancelled) {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. No charges were made.",
        variant: "destructive",
      });
    }
    if (packSuccess && storiesPurchased) {
      toast({
        title: "🎉 Story Pack Purchased!",
        description: `${storiesPurchased} bonus stories have been added to your account.`,
      });
    }
    if (packCancelled) {
      toast({
        title: "Purchase Cancelled",
        description: "Your story pack purchase was cancelled.",
        variant: "destructive",
      });
    }
  }, [cancelled, packSuccess, packCancelled, storiesPurchased, toast]);

  const loadCurrentPlan = async () => {
    const { plan } = await getUserSubscription();
    setCurrentPlan(plan);
  };

  const basePlan = {
    price: 6.99,
    stories: "Unlimited",
    features: [
      "Unlimited interactive stories per month",
      "All story modes (Mystery, Comedy, Thrill, Explore)",
      "Full character customization",
      "Progress tracking & achievements",
      "Ability system & Secret Choices",
      "Priority support",
    ],
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll lose access to Adventure Pass features at the end of your billing period.")) {
      return;
    }

    setLoading(true);
    try {
      const success = await cancelSubscription();
      
      if (success) {
        // Reset premium theme to default
        localStorage.removeItem("premium-theme");
        document.documentElement.removeAttribute("data-theme");
        
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled. You'll retain access until the end of your billing period.",
        });
        await loadCurrentPlan();
      } else {
        throw new Error("Failed to cancel subscription");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up listener for when user returns from Safari checkout
  useEffect(() => {
    if (!isNativePlatform()) return;

    const cleanup = addBrowserCloseListener(async () => {
      // User returned from Safari, check for subscription update
      toast({
        title: "Checking payment status...",
        description: "Please wait while we confirm your subscription",
      });

      const hasSubscription = await pollForSubscriptionUpdate(10, 2000, (status) => {
        if (status) {
          toast({
            title: "🎉 Subscription Activated!",
            description: "Welcome to StoryMaster Kids Adventure Pass!",
          });
          loadCurrentPlan();
        }
      });

      if (!hasSubscription) {
        toast({
          title: "Payment status pending",
          description: "If you completed payment, your subscription will activate shortly.",
        });
      }
    });

    return cleanup;
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    const planType = 'premium';

    // Web platform only - use Stripe checkout
    toast({
      title: "Redirecting to checkout...",
      description: "Opening secure payment window",
    });

    try {
      const deviceId = await getDeviceId();

      // Call edge function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planType, deviceId },
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      if (data?.url) {
        const checkoutWindow = window.open(data.url, '_blank');
        
        if (!checkoutWindow) {
          // Popup was blocked
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Checkout opened",
            description: "Complete your purchase in the new window",
          });
        }
        
        setLoading(false);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: "Failed to process subscription. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-primary via-purple-900 to-indigo-900 pb-24 md:pb-8"
      style={{ paddingBottom: isNative ? Math.max(safeAreaInsets.bottom + 96, 96) : undefined }}
    >
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-foreground hover:bg-primary/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge variant="secondary" className="bg-white/20 text-white">
            Special Offer
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Story Limit Reached Alert - Free users */}
        {limitReached && !currentPlan && (
          <Card className="max-w-2xl mx-auto mb-8 border-2 border-amber-500/50 bg-gradient-to-br from-amber-900/20 to-orange-900/20 backdrop-blur-md">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-full">
                  <Crown className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl text-white mb-2">
                You've Reached Your Story Limit
              </CardTitle>
              <CardDescription className="text-purple-200 text-base">
                You've started all 3 free stories for this month!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-4">
                <div className="flex items-start gap-3 text-purple-100">
                  <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">Your stories reset on a 30-day rolling basis</p>
                    <p className="text-sm text-purple-300 mt-1">Or upgrade to the Adventure Pass now for unlimited stories!</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full border-primary/30 text-foreground hover:bg-primary/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Story Limit Reached Alert - Premium users */}
        {limitReached && currentPlan && (
          <Card className="max-w-2xl mx-auto mb-8 border-2 border-amber-500/50 bg-gradient-to-br from-amber-900/20 to-orange-900/20 backdrop-blur-md">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-full">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl text-white mb-2">
                Monthly Story Limit Reached
              </CardTitle>
              <CardDescription className="text-purple-200 text-base">
                You have unlimited stories with your Adventure Pass!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <div className="flex items-start gap-3 text-purple-100">
                  <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">Your stories reset on a 30-day rolling basis</p>
                    <p className="text-sm text-purple-300 mt-1">You can continue any paused adventures while you wait!</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Current Subscription Status - Only show if user has premium and NOT redirected from limit */}
        {currentPlan && !limitReached && (
          <Card className="max-w-2xl mx-auto mb-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md border-green-400/30 overflow-hidden">
            <CardHeader className="text-center border-b border-white/10 pb-6">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-full">
                  <Crown className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl text-white mb-2">Active Adventure Pass</CardTitle>
              <CardDescription className="text-green-200 text-lg">{currentPlan.name}</CardDescription>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-white mb-2">${currentPlan.price_monthly}</div>
                <div className="text-green-300">per month</div>
              </div>

              <div className="space-y-3 bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                  <span className="text-white">Unlimited stories per month</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                  <span className="text-white">Read-to-Me AI narration included</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                  <span className="text-white">All Adventure Pass features unlocked</span>
                </div>
              </div>

              <Button
                onClick={handleCancelSubscription}
                variant="outline"
                size="lg"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                Cancel Subscription
              </Button>

              <p className="text-center text-green-300 text-sm">
                Your subscription will remain active until the end of the billing period.
              </p>
            </CardContent>
          </Card>
        )}




        {/* Hero Section - Only show if no premium */}
        {!currentPlan && (
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-300 px-4 py-2 rounded-full border border-yellow-500/30 mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">Limited Time Offer</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Replace Gaming &amp; Scrolling With
              <span className="block bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                Addictive Stories
              </span>
            </h1>

            <p className="text-xl text-purple-200 max-w-2xl mx-auto">
              Better than Roblox. More engaging than YouTube. StoryMaster Kids turns mindless screen time into brain-building adventures.
            </p>
          </div>
        )}

        {/* Value Comparison - Only show if no premium */}
        {!currentPlan && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-2">
                <Gamepad2 className="h-8 w-8 text-red-400" />
                <X className="h-5 w-5 text-red-400" />
              </div>
              <CardTitle className="text-white text-lg">Roblox/Gaming</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-3xl font-bold text-white mb-2">$19.99</p>
              <p className="text-purple-300 text-sm">mindless entertainment</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-2">
                <Star className="h-8 w-8 text-orange-400" />
                <X className="h-5 w-5 text-orange-400" />
              </div>
              <CardTitle className="text-white text-lg">YouTube Premium</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-3xl font-bold text-white mb-2">$13.99</p>
              <p className="text-purple-300 text-sm">passive scrolling</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border-green-400/30 relative overflow-hidden ring-2 ring-green-400/50">
            <div className="absolute top-0 right-0 bg-green-400 text-green-900 px-3 py-1 text-xs font-bold rounded-bl-lg">
              BEST VALUE
            </div>
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-2">
                <Crown className="h-8 w-8 text-green-400" />
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <CardTitle className="text-white text-lg">StoryMaster Kids</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-3xl font-bold text-white mb-2">$6.99</p>
              <p className="text-green-300 text-sm font-semibold">engaging + educational</p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Main Pricing Card - Only show if no premium */}
        {!currentPlan && (
        <Card className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <CardHeader className="text-center border-b border-white/10 pb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full">
                <BookOpen className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl text-white mb-2">StoryMaster Kids Adventure Pass</CardTitle>
            <CardDescription className="text-purple-200 text-lg">Unlimited interactive storytelling</CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            {/* Base Plan Features */}
            <div>
              <div className="flex flex-col items-center mb-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-white">${basePlan.price}</span>
                  <span className="text-purple-300 ml-2">/month</span>
                </div>
                <span className="text-purple-300/60 text-xs mt-1">Auto-renews monthly</span>
              </div>

              <div className="space-y-3">
                {basePlan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                    <span className="text-white">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Read-to-Me Highlight */}
            <div className="relative bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 rounded-xl p-5 border border-purple-400/30 overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-pink-500 to-purple-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                INCLUDED FREE
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl shrink-0">
                  <Volume2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">🎧 Read-to-Me AI Narration</h3>
                  <p className="text-purple-200 text-sm leading-relaxed">
                    Every story comes alive with expressive AI voices. Perfect for bedtime, car rides, or when your child wants to follow along while listening. No extra cost — it's built right in.
                  </p>
                </div>
              </div>
            </div>

            {/* Total & CTA */}
            <div className="border-t border-white/10 pt-8 space-y-4">
              <div className="flex items-center justify-between text-2xl">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white font-bold">${basePlan.price}/month</span>
              </div>

              {/* Payment Button - Apple IAP on native, Stripe on web */}
              {isNativePlatform() ? (
                <>
                  <Button
                    onClick={async () => {
                      setLoading(true);
                      const planType = 'premium';
                      const result = await purchasePackage(planType);
                      if (result.success) {
                        // Activate subscription directly in Supabase
                        await activateSubscriptionAfterPurchase(planType);
                        toast({
                          title: "🎉 Subscription Activated!",
                          description: "Welcome to StoryMaster Kids Adventure Pass!",
                        });
                        await loadCurrentPlan();
                      } else if (result.error !== 'cancelled') {
                        toast({
                          title: "Purchase Failed",
                          description: result.error || "Please try again.",
                          variant: "destructive",
                        });
                      }
                      setLoading(false);
                    }}
                    disabled={loading}
                    size="xl"
                    className="w-full bg-black hover:bg-gray-900 text-white font-bold text-xl py-8 rounded-xl shadow-2xl border border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-3">
                      <Apple className="h-7 w-7" />
                      {loading ? "Processing..." : "Subscribe with Apple"}
                    </span>
                  </Button>
                  <Button
                    onClick={async () => {
                      setLoading(true);
                      const result = await restorePurchases();
                      if (result.isSubscribed) {
                        // Also activate in Supabase when restoring
                        await activateSubscriptionAfterPurchase('premium');
                        toast({
                          title: "✅ Purchases Restored!",
                          description: "Your subscription has been restored.",
                        });
                        await loadCurrentPlan();
                      } else {
                        toast({
                          title: "No Purchases Found",
                          description: "No previous subscriptions were found for this Apple ID.",
                        });
                      }
                      setLoading(false);
                    }}
                    disabled={loading}
                    variant="ghost"
                    className="w-full text-purple-300 hover:text-white hover:bg-white/10"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore Purchases
                  </Button>
                  <p className="text-center text-purple-300 text-xs">
                    Secure payment through the App Store
                  </p>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleSubscribe}
                    disabled={loading}
                    size="xl"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xl py-8 rounded-xl shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? "Processing..." : (
                      <span className="flex items-center gap-3">
                        <CreditCard className="h-6 w-6" />
                        Start Your Adventure
                      </span>
                    )}
                  </Button>
                  <p className="text-center text-purple-300 text-xs">
                    Secure checkout powered by Stripe
                  </p>
                </>
              )}

              <p className="text-center text-purple-300 text-sm">Cancel anytime. No long-term commitment required.</p>
            </div>
            </CardContent>
        </Card>
        )}

        {/* Story Pack Purchase - Only for Adventure Pass subscribers */}
        {/* Removed from non-subscriber view - story packs are a subscriber-only benefit */}

        {/* Premium Guarantees */}
        <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-xl font-bold text-white mb-2">No Commitment</div>
            <div className="text-purple-300">Cancel anytime, no questions asked</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="text-4xl mb-2">⚡</div>
            <div className="text-xl font-bold text-white mb-2">Instant Access</div>
            <div className="text-purple-300">Start reading immediately after signup</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="text-4xl mb-2">🛡️</div>
            <div className="text-xl font-bold text-white mb-2">Safe Content</div>
            <div className="text-purple-300">Age-appropriate stories, always</div>
          </div>
        </div>

        {/* FAQ / Trust Builders */}
        <div className="max-w-3xl mx-auto mt-12 space-y-4">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Why Parents Love StoryMaster Kids</h2>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">🎯 Personalized Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-200">
                Stories adapt to your child's reading level and interests, making every adventure engaging and
                educational.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">📊 Track Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-200">
                See your child's reading growth with detailed analytics, comprehension scores, and achievement tracking.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">✨ Screen Time Worth It</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-200">
                Transform passive screen time into active learning. Every session builds reading skills and imagination.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-purple-300/60 mt-8 pb-4">
          By subscribing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-purple-200 transition-colors">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="underline hover:text-purple-200 transition-colors">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
