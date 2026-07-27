import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/story';
import { getUserSubscription, invalidateSubscriptionCache } from '@/lib/subscription';

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
  planType: 'premium'
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

let activePollTimeout: ReturnType<typeof setTimeout> | null = null;
let activePollResolve: ((value: boolean) => void) | null = null;

/**
 * Stop any active subscription polling. Useful when the user leaves the
 * paywall before Stripe completes the checkout.
 */
export const stopSubscriptionPolling = (): void => {
  if (activePollTimeout) {
    clearTimeout(activePollTimeout);
    activePollTimeout = null;
  }
  if (activePollResolve) {
    activePollResolve(false);
    activePollResolve = null;
  }
};

/**
 * Poll for subscription status updates after payment.
 * Uses exponential backoff to reduce database reads (1s, 2s, 4s, 8s, ...)
 * while still updating quickly when the webhook lands.
 */
export const pollForSubscriptionUpdate = async (
  maxAttempts: number = 10,
  onStatusChange?: (hasSubscription: boolean) => void
): Promise<boolean> => {
  let attempts = 0;
  let intervalMs = 1000;

  // Ensure only one poll runs at a time.
  stopSubscriptionPolling();

  return new Promise((resolve) => {
    activePollResolve = resolve;

    const checkSubscription = async () => {
      attempts++;

      try {
        const { plan } = await getUserSubscription();

        if (plan) {
          // Subscription found! Clear the client cache so other pages refresh
          // with the latest status immediately.
          invalidateSubscriptionCache();
          activePollResolve = null;
          onStatusChange?.(true);
          resolve(true);
          return;
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }

      if (attempts >= maxAttempts) {
        activePollResolve = null;
        onStatusChange?.(false);
        resolve(false);
        return;
      }

      // Exponential backoff, capped at 8 seconds.
      intervalMs = Math.min(intervalMs * 2, 8000);
      activePollTimeout = setTimeout(checkSubscription, intervalMs);
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
