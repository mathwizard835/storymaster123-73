import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Share2, Gift, Users, Copy, Check } from "lucide-react";
import { getReferralStats, createReferral, getShareableReferralLink } from "@/lib/referrals";
import { useToast } from "@/hooks/use-toast";
import { referralCodeSchema } from "@/lib/validationSchemas";

export const ReferralWidget = () => {
  const [stats, setStats] = useState({
    totalReferrals: 0,
    completedReferrals: 0,
    bonusStoriesEarned: 0,
    referralCode: ''
  });
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReferralStats();
  }, []);

  const loadReferralStats = async () => {
    const data = await getReferralStats();
    setStats(data);
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return;
    
    // Validate referral code format
    const validationResult = referralCodeSchema.safeParse(referralCode);
    if (!validationResult.success) {
      toast({
        title: "Invalid Referral Code",
        description: validationResult.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    const result = await createReferral(validationResult.data);
    
    toast({
      title: result.success ? "Referral Applied!" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    
    if (result.success) {
      setReferralCode('');
      loadReferralStats();
    }
    setLoading(false);
  };

  const handleShareReferral = async () => {
    const baseUrl = window.location.origin;
    const shareUrl = await getShareableReferralLink(baseUrl);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on StoryMaster Kids!',
          text: 'Create amazing interactive stories together! Use my referral code to get bonus stories.',
          url: shareUrl,
        });
      } catch (err) {
        // Share was cancelled or unsupported
      }
    } else {
      // Fallback to copying link
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link Copied!",
        description: "Referral link copied to clipboard.",
      });
    }
  };

  const copyReferralCode = async () => {
    await navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Code Copied!",
      description: "Referral code copied to clipboard.",
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Share Your Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share & Earn
          </CardTitle>
          <CardDescription>
            Invite friends and earn 3 bonus stories for each friend who completes their first story!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Your Referral Code</label>
            <div className="flex gap-2 mt-1">
              <Input value={stats.referralCode} readOnly />
              <Button size="sm" variant="outline" onClick={copyReferralCode}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <Button onClick={handleShareReferral} className="w-full" variant="default">
            <Share2 className="w-4 h-4 mr-2" />
            Share Referral Link
          </Button>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{stats.totalReferrals}</div>
              <div className="text-xs text-muted-foreground">Invited</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{stats.completedReferrals}</div>
              <div className="text-xs text-muted-foreground">Joined</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">{stats.bonusStoriesEarned}</div>
              <div className="text-xs text-muted-foreground">Bonus Stories</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Friend's Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Use Friend's Code
          </CardTitle>
          <CardDescription>
            Have a referral code from a friend? Enter it here to get bonus stories!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Friend's Referral Code</label>
            <div className="flex gap-2 mt-1">
              <Input 
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter code here"
                maxLength={8}
              />
              <Button 
                size="sm" 
                onClick={handleApplyReferral}
                disabled={loading || !referralCode.trim()}
              >
                Apply
              </Button>
            </div>
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">How it works:</span>
            </div>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Enter your friend's referral code</li>
              <li>• Complete your first story</li>
              <li>• Both you and your friend get 3 bonus stories!</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};