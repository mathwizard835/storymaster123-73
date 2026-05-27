import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/story";

export type SubscriptionPlan = {
  id: string;
  name: string;
  price_monthly: number;
  features: {
    daily_stories: number;
    premium_characters: boolean;
    squad_missions: boolean;
    read_to_me?: boolean;
    priority_support?: boolean;
    early_access?: boolean;
    custom_avatars?: boolean;
  };
  story_limit: number;
};

export type UserSubscription = {
  id: string;
  device_id: string;
  user_id?: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  starts_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
};

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (error) throw error;
    return (data || []).map(plan => ({
      ...plan,
      features: plan.features as SubscriptionPlan['features']
    }));
  } catch (e) {
    console.error("Failed to fetch subscription plans", e);
    return [];
  }
};

// A subscription row entitles the user right now if:
//   - status='active' AND (expires_at is null OR expires_at > now())   [normal active]
//   - status='cancelled' AND expires_at IS NOT NULL AND expires_at > now()  [cancel-at-period-end grace]
// Anything else (status='expired', past expires_at, status='cancelled' w/o expires_at) is NOT entitled.
const isCurrentlyEntitled = (row: any): boolean => {
  if (!row) return false;
  const now = Date.now();
  const expiresMs = row.expires_at ? new Date(row.expires_at).getTime() : null;
  if (row.status === 'active') {
    if (expiresMs !== null && expiresMs <= now) return false;
    return true;
  }
  if (row.status === 'cancelled') {
    if (expiresMs !== null && expiresMs > now) return true;
  }
  return false;
};

export const getUserSubscription = async (): Promise<{
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
}> => {
  try {
    const deviceId = await getDeviceId();

    // Fetch the most recent active OR cancelled rows for this device (we'll
    // pick the first one that's currently entitled, so cancel-at-period-end
    // and expires_at are honored).
    let { data: deviceRows, error } = await supabase
      .from('user_subscriptions')
      .select(`*, subscription_plans (*)`)
      .eq('device_id', deviceId)
      .in('status', ['active', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (error && error.code !== 'PGRST116') throw error;

    let data = (deviceRows || []).find(isCurrentlyEntitled) || null;

    // Fall back to user_id lookup (cross-device, manual grants, etc.)
    if (!data) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userRows, error: userError } = await supabase
          .from('user_subscriptions')
          .select(`*, subscription_plans (*)`)
          .eq('user_id', user.id)
          .in('status', ['active', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(5);
        if (userError && userError.code !== 'PGRST116') throw userError;
        data = (userRows || []).find(isCurrentlyEntitled) || null;
      }
    }

    return {
      subscription: data ? {
        ...data,
        status: data.status as 'active' | 'cancelled' | 'expired'
      } : null,
      plan: data?.subscription_plans ? {
        ...data.subscription_plans,
        features: data.subscription_plans.features as SubscriptionPlan['features']
      } : null
    };
  } catch (e) {
    console.error("Failed to fetch user subscription", e);
    return { subscription: null, plan: null };
  }
};

// upgradeSubscription has been removed for security.
// Subscriptions can ONLY be activated via:
// - Stripe webhook (web purchases)
// - RevenueCat/Apple IAP (iOS purchases)

export const cancelSubscription = async (): Promise<{
  success: boolean;
  accessUntil?: string | null;
  error?: string;
}> => {
  try {
    // Web cancel must go through Stripe so Stripe stops billing.
    // The edge function flips cancel_at_period_end=true and updates expires_at,
    // KEEPING status='active' so the user retains access until period end.
    const { data, error } = await supabase.functions.invoke(
      'stripe-cancel-subscription',
      { body: {} },
    );
    if (error) throw error;
    return {
      success: true,
      accessUntil: data?.accessUntil ?? null,
    };
  } catch (e: any) {
    console.error("Failed to cancel subscription via Stripe", e);
    return { success: false, error: e?.message || 'cancel_failed' };
  }
};

export const getStoriesRemaining = async (): Promise<{
  storiesUsedThisMonth: number;
  monthlyLimit: number;
  bonusStories: number;
  canPlay: boolean;
}> => {
  try {
    const deviceId = await getDeviceId();
    const { isNativePlatform } = await import("@/lib/platform");
    const isNative = isNativePlatform();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get current subscription plan
    const { plan } = await getUserSubscription();

    // Determine monthly/lifetime limit.
    // - Native (mobile app): HARD PAYWALL — non-subscribers cannot generate ANY stories.
    // - Web: 3 stories per rolling 30 days (legacy behavior preserved).
    // - Subscribers: 40/30d soft cap.
    let monthlyLimit = isNative ? 0 : 3;
    if (plan) {
      const planName = plan.name?.toLowerCase().trim().replace(/\s+/g, '_');
      if (planName === 'premium' || planName === 'premium_plus' ||
          planName?.includes('premium') || plan.story_limit === null) {
        monthlyLimit = 40;
      } else if (plan.story_limit && plan.story_limit > 0) {
        monthlyLimit = plan.story_limit;
      } else if (plan.features?.daily_stories) {
        monthlyLimit = plan.features.daily_stories;
      }
    }

    const isFreeOnNative = isNative && (!plan || plan.name?.toLowerCase() === 'free');

    let storiesUsedThisMonth = 0;
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Native free users: count LIFETIME stories. Otherwise: rolling 30 days.
      let query = supabase
        .from('user_stories')
        .select('id')
        .eq('user_id', user.id);
      if (!isFreeOnNative) {
        query = query
          .gte('started_at', thirtyDaysAgo.toISOString())
          .lte('started_at', now.toISOString());
      }
      const { data: userStories, error: storiesError } = await query;
      if (storiesError) throw storiesError;
      storiesUsedThisMonth = userStories?.length || 0;
    } else {
      const { data: monthStories, error: storiesError } = await supabase
        .from('story_completions')
        .select('id')
        .eq('device_id', deviceId)
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .lte('completed_at', now.toISOString());

      if (storiesError) throw storiesError;
      storiesUsedThisMonth = monthStories?.length || 0;
    }

    // Bonus stories from referrals/streaks — only honored on web (native is a hard paywall)
    let bonusStories = 0;
    if (user && !isFreeOnNative) {
      const { data: refs } = await supabase
        .from('referrals')
        .select('bonus_stories_earned')
        .eq('referrer_user_id', user.id)
        .eq('status', 'completed');
      const { data: streak } = await supabase
        .from('daily_streaks')
        .select('bonus_stories_earned')
        .eq('user_id', user.id)
        .maybeSingle();
      const referralBonus = refs?.reduce((t, r) => t + (r.bonus_stories_earned || 0), 0) || 0;
      const streakBonus = streak?.bonus_stories_earned || 0;
      bonusStories = referralBonus + streakBonus;
    }

    const totalAllowed = monthlyLimit + bonusStories;
    const canPlay = storiesUsedThisMonth < totalAllowed;

    console.log(`📊 Story limits: ${storiesUsedThisMonth}/${monthlyLimit} (${isFreeOnNative ? 'lifetime, native' : 'rolling 30d'}, bonus ${bonusStories}, canPlay ${canPlay})`);

    return { storiesUsedThisMonth, monthlyLimit, bonusStories, canPlay };
  } catch (e) {
    console.error("Failed to check stories remaining", e);
    // Fail-closed on native (hard paywall), fail-open on web to avoid blocking.
    let isNative = false;
    try {
      const { isNativePlatform } = await import("@/lib/platform");
      isNative = isNativePlatform();
    } catch {}
    return {
      storiesUsedThisMonth: 0,
      monthlyLimit: isNative ? 0 : 3,
      bonusStories: 0,
      canPlay: !isNative,
    };
  }
};