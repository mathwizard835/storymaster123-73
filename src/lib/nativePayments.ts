import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/story';
import { getUserSubscription } from '@/lib/subscription';

/**
 * Native Payment Flow for iOS
 * 
 * This module handles Stripe payments on iOS by opening Safari browser
 * instead of using in-app WebViews or Apple IAP.
 * 
 * Flow:
 * 1. Create Stripe checkout session via edge function
 * 2. Open Safari with Browser.open() for secure checkout
 * 3. Stripe webhook updates entitlements on backend
 * 4. App polls for subscription status updates
 */

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isIOSPlatform = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const isAndroidPlatform = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Opens Stripe checkout in Safari (for iOS) or default browser (for Android)
 * This avoids Apple's 15-30% fee while complying with US App Store rules
 */
export const openStripeCheckoutInBrowser = async (
  planType: 'premium' | 'premium_plus'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const deviceId = await getDeviceId();

    // Create Stripe checkout session via edge function
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { planType, deviceId },
    });

    if (error) {
      console.error('Failed to create checkout session:', error);
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return { success: false, error: 'No checkout URL returned' };
    }

    // Open in Safari/external browser (not WebView)
    await Browser.open({ 
      url: data.url,
      presentationStyle: 'popover', // iOS: opens in Safari
      windowName: '_blank',
    });

    return { success: true };
  } catch (error) {
    console.error('Error opening checkout:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to open checkout' 
    };
  }
};

/**
 * Close the browser (useful after successful payment)
 */
export const closeBrowser = async (): Promise<void> => {
  try {
    await Browser.close();
  } catch (error) {
    // Browser may already be closed
    console.log('Browser close attempted:', error);
  }
};

/**
 * Add listener for browser close events
 * This helps detect when user returns from checkout
 */
export const addBrowserCloseListener = (callback: () => void): (() => void) => {
  const listener = Browser.addListener('browserFinished', () => {
    callback();
  });

  // Return cleanup function
  return () => {
    listener.then(l => l.remove());
  };
};

/**
 * Poll for subscription status updates after payment
 * This is used when the user returns from Safari checkout
 */
export const pollForSubscriptionUpdate = async (
  maxAttempts: number = 10,
  intervalMs: number = 2000,
  onStatusChange?: (hasSubscription: boolean) => void
): Promise<boolean> => {
  let attempts = 0;

  return new Promise((resolve) => {
    const checkSubscription = async () => {
      attempts++;
      
      try {
        const { plan } = await getUserSubscription();
        
        if (plan) {
          // Subscription found!
          onStatusChange?.(true);
          resolve(true);
          return;
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }

      if (attempts >= maxAttempts) {
        onStatusChange?.(false);
        resolve(false);
        return;
      }

      // Continue polling
      setTimeout(checkSubscription, intervalMs);
    };

    checkSubscription();
  });
};

/**
 * Refresh subscription status from backend
 * Call this when app returns to foreground
 */
export const refreshSubscriptionStatus = async (): Promise<{
  hasSubscription: boolean;
  planName?: string;
}> => {
  try {
    const { plan } = await getUserSubscription();
    
    return {
      hasSubscription: !!plan,
      planName: plan?.name,
    };
  } catch (error) {
    console.error('Error refreshing subscription:', error);
    return { hasSubscription: false };
  }
};
