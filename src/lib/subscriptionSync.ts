import { getUserSubscription } from './subscription';

/**
 * Global subscription state cache to prevent excessive database queries
 */
let subscriptionCache: {
  plan: any;
  lastChecked: number;
} | null = null;

const CACHE_DURATION = 30000; // 30 seconds

/**
 * Get cached subscription or fetch fresh if cache is stale
 */
export const getCachedSubscription = async (): Promise<{ plan: any }> => {
  const now = Date.now();
  
  // Return cache if valid
  if (subscriptionCache && (now - subscriptionCache.lastChecked) < CACHE_DURATION) {
    return { plan: subscriptionCache.plan };
  }
  
  // Fetch fresh subscription
  const { plan } = await getUserSubscription();
  
  // Update cache
  subscriptionCache = {
    plan,
    lastChecked: now
  };
  
  return { plan };
};

/**
 * Force refresh subscription cache
 */
export const refreshSubscriptionCache = async (): Promise<void> => {
  const { plan } = await getUserSubscription();
  subscriptionCache = {
    plan,
    lastChecked: Date.now()
  };
};

/**
 * Clear subscription cache (call on logout)
 */
export const clearSubscriptionCache = (): void => {
  subscriptionCache = null;
};
