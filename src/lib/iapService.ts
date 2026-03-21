import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY = 'appl_CYSaouklfOSVoVtsNzDQALOTXCL';

// Product IDs matching App Store Connect
const PRODUCT_IDS = {
  premium: 'sm_699_1m',
} as const;

// Entitlement IDs matching RevenueCat dashboard
const ENTITLEMENT_IDS = {
  premium: 'premium',
} as const;

let isInitialized = false;

// Lazy-load RevenueCat only on native platforms
let _purchasesModule: any = null;
const getPurchasesModule = async () => {
  if (!_purchasesModule) {
    _purchasesModule = await import('@revenuecat/purchases-capacitor');
  }
  return _purchasesModule;
};

/**
 * Initialize RevenueCat SDK — call once on app startup (native only)
 */
export const initializeRevenueCat = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || isInitialized) return;

  try {
    const { Purchases, LOG_LEVEL } = await getPurchasesModule();
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    });
    isInitialized = true;
    console.log('✅ RevenueCat initialized');
  } catch (error) {
    console.error('❌ RevenueCat init failed:', error);
  }
};

/**
 * Identify user with RevenueCat (call after auth)
 */
export const identifyUser = async (userId: string): Promise<void> => {
  if (!Capacitor.isNativePlatform() || !isInitialized) return;

  try {
    const { Purchases } = await getPurchasesModule();
    await Purchases.logIn({ appUserID: userId });
    console.log('✅ RevenueCat user identified:', userId);
  } catch (error) {
    console.error('❌ RevenueCat identify failed:', error);
  }
};

/**
 * Log out from RevenueCat (call on sign out)
 */
export const logOutRevenueCat = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || !isInitialized) return;

  try {
    const { Purchases } = await getPurchasesModule();
    await Purchases.logOut();
  } catch (error) {
    console.error('RevenueCat logout error:', error);
  }
};

export interface IAPPackage {
  identifier: string;
  productId: string;
  priceString: string;
  price: number;
}

/**
 * Fetch available packages from RevenueCat offerings
 */
export const getOfferings = async (): Promise<{
  premium: IAPPackage | null;
}> => {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    return { premium: null };
  }

  try {
    const { Purchases } = await getPurchasesModule();
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;

    if (!current) {
      console.warn('No current offering found');
      return { premium: null };
    }

    let premium: IAPPackage | null = null;

    for (const pkg of current.availablePackages) {
      const product = pkg.product;
      if (product.identifier === PRODUCT_IDS.premium) {
        premium = {
          identifier: pkg.identifier,
          productId: product.identifier,
          priceString: product.priceString,
          price: product.price,
        };
      }
    }

    return { premium };
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return { premium: null };
  }
};

/**
 * Purchase a package via Apple IAP
 */
export const purchasePackage = async (
  planType: 'premium'
): Promise<{ success: boolean; error?: string }> => {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    return { success: false, error: 'Not on native platform' };
  }

  try {
    const { Purchases, PURCHASES_ERROR_CODE } = await getPurchasesModule();
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;

    if (!current) {
      return { success: false, error: 'No offerings available' };
    }

    const targetProductId = PRODUCT_IDS[planType];
    const targetPackage = current.availablePackages.find(
      (pkg: any) => pkg.product.identifier === targetProductId
    );

    if (!targetPackage) {
      return { success: false, error: `Package ${targetProductId} not found` };
    }

    const result = await Purchases.purchasePackage({ aPackage: targetPackage });

    // Check entitlement
    const entitlementId = ENTITLEMENT_IDS[planType];
    const entitlement = result.customerInfo.entitlements.active[entitlementId];

    if (entitlement) {
      console.log('✅ Purchase successful, entitlement active:', entitlementId);
      return { success: true };
    }

    // Check if any entitlement is active
    const anyActive = Object.keys(result.customerInfo.entitlements.active).length > 0;
    if (anyActive) {
      console.log('✅ Purchase successful with active entitlements');
      return { success: true };
    }

    return { success: false, error: 'Purchase completed but entitlement not active' };
  } catch (error: any) {
    const { PURCHASES_ERROR_CODE } = await getPurchasesModule();
    if (error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, error: 'cancelled' };
    }
    console.error('Purchase error:', error);
    return {
      success: false,
      error: error?.message || 'Purchase failed',
    };
  }
};

/**
 * Check current subscription status from RevenueCat
 */
export const checkSubscriptionStatus = async (): Promise<{
  isSubscribed: boolean;
  expirationDate?: string;
}> => {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    return { isSubscribed: false };
  }

  try {
    const { Purchases } = await getPurchasesModule();
    const customerInfo = await Purchases.getCustomerInfo();
    const active = customerInfo.customerInfo.entitlements.active;

    const isPremium = !!active[ENTITLEMENT_IDS.premium];

    return {
      isSubscribed: isPremium || Object.keys(active).length > 0,
      expirationDate: active[ENTITLEMENT_IDS.premium]?.expirationDate || undefined,
    };
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return { isSubscribed: false };
  }
};

/**
 * Activate subscription in Supabase after successful IAP purchase.
 * This is the critical step — don't rely solely on RevenueCat webhooks.
 */
export const activateSubscriptionAfterPurchase = async (
  planType: 'premium'
): Promise<boolean> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { getDeviceId } = await import('@/lib/story');

    const deviceId = await getDeviceId();
    const { data: { user } } = await supabase.auth.getUser();

    // Get the matching plan from subscription_plans table
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('price_monthly', 6.99)
      .limit(1)
      .maybeSingle();

    if (!plan) {
      console.error('Could not find plan for type:', planType);
      return false;
    }

    // Cancel any existing active subscriptions for this user/device
    const cancelQuery = supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('status', 'active');

    if (user) {
      await cancelQuery.or(`device_id.eq.${deviceId},user_id.eq.${user.id}`);
    } else {
      await cancelQuery.eq('device_id', deviceId);
    }

    // Insert new active subscription
    const { error } = await supabase
      .from('user_subscriptions')
      .insert([{
        device_id: deviceId,
        plan_id: plan.id,
        status: 'active' as const,
        starts_at: new Date().toISOString(),
        user_id: user?.id || null,
      }]);

    if (error) {
      console.error('Failed to activate subscription in DB:', error);
      return false;
    }

    console.log('✅ Subscription activated in Supabase for plan:', planType);
    return true;
  } catch (error) {
    console.error('Error activating subscription:', error);
    return false;
  }
};

/**
 * Restore purchases (required by Apple)
 */
export const restorePurchases = async (): Promise<{
  success: boolean;
  isSubscribed: boolean;
}> => {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    return { success: false, isSubscribed: false };
  }

  try {
    const { Purchases } = await getPurchasesModule();
    const customerInfo = await Purchases.restorePurchases();
    const active = customerInfo.customerInfo.entitlements.active;
    const isSubscribed = Object.keys(active).length > 0;

    return { success: true, isSubscribed };
  } catch (error) {
    console.error('Restore purchases failed:', error);
    return { success: false, isSubscribed: false };
  }
};
