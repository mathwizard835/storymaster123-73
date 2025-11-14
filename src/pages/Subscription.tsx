import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, X, Volume2, BookOpen, Star, Sparkles, Crown, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { upgradeSubscription, getUserSubscription, type SubscriptionPlan } from "@/lib/subscription";

export default function Subscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [readToMeEnabled, setReadToMeEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    const { plan } = await getUserSubscription();
    setCurrentPlan(plan);
  };

  const basePlan = {
    price: 4.99,
    stories: 10,
    features: [
      "10 interactive stories per month",
      "All story modes (Mystery, Comedy, Thrill, Explore)",
      "Full character customization",
      "Progress tracking & achievements",
      "Ability system & Ultra Choices",
      "Priority support"
    ]
  };

  const readToMeUpsell = {
    price: 1.00,
    features: [
      "Professional voice narration for all stories",
      "Multiple voice options per story mode",
      "High-quality AI voices",
      "Perfect for bedtime reading"
    ]
  };

  const totalPrice = readToMeEnabled ? basePlan.price + readToMeUpsell.price : basePlan.price;

  const handleSubscribe = async () => {
    setLoading(true);
    
    // Structured for In-App Purchase integration
    // Currently simulates the experience by granting premium access
    try {
      // Plan IDs from database:
      // premium: $4.99/mo - 10 stories/day, no read-to-me
      // premium_plus: $5.99/mo - 10 stories/day, with read-to-me
      const planId = readToMeEnabled 
        ? '1f07f062-4123-4e51-9c5d-9541836a8f1c' // premium_plus
        : 'c414127f-af31-47f1-b474-d59bf4956e1f'; // premium
      
      // TODO: When implementing real IAP, replace this with:
      // 1. Trigger platform-specific purchase flow (App Store/Google Play)
      // 2. Verify purchase with platform
      // 3. Then call upgradeSubscription with verified receipt
      
      const success = await upgradeSubscription(planId);
      
      if (success) {
        toast({
          title: "🎉 Welcome to Premium!",
          description: `You now have access to all premium features!`,
        });
        navigate('/dashboard');
      } else {
        throw new Error('Subscription upgrade failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge variant="secondary" className="bg-white/20 text-white">
            Special Offer
          </Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-300 px-4 py-2 rounded-full border border-yellow-500/30 mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">Limited Time Offer</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Make Reading an
            <span className="block bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              Epic Adventure
            </span>
          </h1>
          
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Transform screen time into reading time with personalized, interactive stories that adapt to your child's choices.
          </p>
        </div>

        {/* Value Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="h-8 w-8 text-red-400" />
                <X className="h-5 w-5 text-red-400" />
              </div>
              <CardTitle className="text-white text-lg">Traditional Books</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-3xl font-bold text-white mb-2">$10-15</p>
              <p className="text-purple-300 text-sm">per book, often unread</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-2">
                <Star className="h-8 w-8 text-orange-400" />
                <X className="h-5 w-5 text-orange-400" />
              </div>
              <CardTitle className="text-white text-lg">Other Apps</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-3xl font-bold text-white mb-2">$9.99+</p>
              <p className="text-purple-300 text-sm">no personalization</p>
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
              <CardTitle className="text-white text-lg">StoryMaster</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-3xl font-bold text-white mb-2">$4.99</p>
              <p className="text-green-300 text-sm font-semibold">120+ stories/year</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Pricing Card */}
        <Card className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <CardHeader className="text-center border-b border-white/10 pb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full">
                <BookOpen className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl text-white mb-2">StoryMaster Premium</CardTitle>
            <CardDescription className="text-purple-200 text-lg">
              Unlimited interactive storytelling
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            {/* Base Plan Features */}
            <div>
              <div className="flex items-baseline justify-center mb-6">
                <span className="text-5xl font-bold text-white">${basePlan.price}</span>
                <span className="text-purple-300 ml-2">/month</span>
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

            {/* Read-To-Me Upsell */}
            <div className="border-t border-white/10 pt-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 p-2 rounded-lg">
                    <Volume2 className="h-6 w-6 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Add Read-To-Me</h3>
                    <p className="text-purple-300 text-sm">Professional voice narration</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-white">+${readToMeUpsell.price}</span>
                  <Switch
                    checked={readToMeEnabled}
                    onCheckedChange={setReadToMeEnabled}
                    className="data-[state=checked]:bg-purple-500"
                  />
                </div>
              </div>

              {readToMeEnabled && (
                <div className="space-y-3 bg-purple-900/20 rounded-lg p-4 border border-purple-500/20">
                  {readToMeUpsell.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                      <span className="text-purple-200">{feature}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total & CTA */}
            <div className="border-t border-white/10 pt-8 space-y-4">
              <div className="flex items-center justify-between text-2xl">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white font-bold">${totalPrice.toFixed(2)}/month</span>
              </div>

              <Button
                onClick={handleSubscribe}
                disabled={loading}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg py-6"
              >
                {loading ? "Processing..." : "Start Your Adventure"}
              </Button>

              <p className="text-center text-purple-300 text-sm">
                Cancel anytime. No long-term commitment required.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Social Proof */}
        <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="text-4xl font-bold text-white mb-2">10,000+</div>
            <div className="text-purple-300">Happy Families</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="text-4xl font-bold text-white mb-2">4.9★</div>
            <div className="text-purple-300">Average Rating</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="text-4xl font-bold text-white mb-2">500K+</div>
            <div className="text-purple-300">Stories Created</div>
          </div>
        </div>

        {/* FAQ / Trust Builders */}
        <div className="max-w-3xl mx-auto mt-12 space-y-4">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Why Parents Love StoryMaster</h2>
          
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">🎯 Personalized Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-200">Stories adapt to your child's reading level and interests, making every adventure engaging and educational.</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">📊 Track Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-200">See your child's reading growth with detailed analytics, comprehension scores, and achievement tracking.</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">✨ Screen Time Worth It</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-200">Transform passive screen time into active learning. Every session builds reading skills and imagination.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
