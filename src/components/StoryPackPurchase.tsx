import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookPlus, ShoppingCart, Apple, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isNativePlatform, isIOSPlatform } from "@/lib/nativePayments";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/story";

interface StoryPack {
  stories: number;
  price: number;
  priceId?: string; // Stripe price ID for web payments
}

const STORY_PACKS: StoryPack[] = [
  { stories: 10, price: 4.99 },
  { stories: 20, price: 6.99 },
  { stories: 30, price: 9.99 },
];

interface StoryPackPurchaseProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const StoryPackPurchase = ({ variant = 'full', className = '' }: StoryPackPurchaseProps) => {
  const [selectedPack, setSelectedPack] = useState<string>('10');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectedPackData = STORY_PACKS.find(p => p.stories.toString() === selectedPack);

  const handlePurchase = async (useApplePay: boolean = false) => {
    if (!selectedPackData) return;
    
    setLoading(true);
    
    try {
      if (useApplePay && isIOSPlatform()) {
        // Apple In-App Purchase flow
        toast({
          title: "Apple Pay",
          description: "In-App Purchases will be available soon. For now, please use the web checkout option.",
        });
        setLoading(false);
        return;
      }

      // Stripe checkout for story packs
      const deviceId = await getDeviceId();
      
      const { data, error } = await supabase.functions.invoke('create-story-pack-checkout', {
        body: { 
          packSize: selectedPackData.stories,
          deviceId 
        },
      });

      if (error) throw error;

      if (data?.url) {
        if (isNativePlatform()) {
          // Open in Safari for native apps
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ 
            url: data.url,
            presentationStyle: 'popover',
            windowName: '_blank',
          });
        } else {
          // Open in new tab for web
          const checkoutWindow = window.open(data.url, '_blank');
          if (!checkoutWindow) {
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
        }
      }
    } catch (error) {
      console.error('Story pack purchase error:', error);
      toast({
        title: "Error",
        description: "Failed to process purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <BookPlus className="h-5 w-5 text-purple-400" />
          <span className="text-white font-semibold">Buy More Stories</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPack} onValueChange={setSelectedPack}>
            <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/20">
              {STORY_PACKS.map((pack) => (
                <SelectItem 
                  key={pack.stories} 
                  value={pack.stories.toString()}
                  className="text-white hover:bg-white/10 focus:bg-white/10"
                >
                  {pack.stories} stories - ${pack.price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => handlePurchase(false)}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? "..." : (
              <>
                <ShoppingCart className="h-4 w-4 mr-1" />
                Buy
              </>
            )}
          </Button>
        </div>

        {isIOSPlatform() && (
          <Button
            onClick={() => handlePurchase(true)}
            disabled={loading}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Apple className="h-4 w-4 mr-2" />
            Pay with Apple
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`bg-white/10 backdrop-blur-md border-white/20 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <BookPlus className="h-5 w-5 text-purple-400" />
          Buy Story Packs
        </CardTitle>
        <CardDescription className="text-purple-200">
          Need more stories? Purchase additional story packs as an Adventure Pass member
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Select value={selectedPack} onValueChange={setSelectedPack}>
          <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Select a pack" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/20">
            {STORY_PACKS.map((pack) => (
              <SelectItem 
                key={pack.stories} 
                value={pack.stories.toString()}
                className="text-white hover:bg-white/10 focus:bg-white/10"
              >
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{pack.stories} stories</span>
                  <span className="font-bold">${pack.price.toFixed(2)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPackData && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-purple-200">Selected Pack</span>
              <span className="text-white font-bold">{selectedPackData.stories} Stories</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-200">Price</span>
              <span className="text-2xl font-bold text-white">${selectedPackData.price.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={() => handlePurchase(false)}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? "Processing..." : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                {isNativePlatform() ? "Continue to Secure Checkout" : "Purchase with Card"}
              </>
            )}
          </Button>

          {isIOSPlatform() && (
            <Button
              onClick={() => handlePurchase(true)}
              disabled={loading}
              variant="outline"
              className="w-full border-white/30 text-white hover:bg-white/10"
            >
              <Apple className="h-4 w-4 mr-2" />
              Pay with Apple (In-App Purchase)
            </Button>
          )}
        </div>

        <p className="text-center text-purple-300 text-xs">
          Story packs never expire. Use them anytime!
        </p>
      </CardContent>
    </Card>
  );
};
