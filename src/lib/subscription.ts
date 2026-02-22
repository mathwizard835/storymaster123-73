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

export const getUserSubscription = async (): Promise<{
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
}> => {
  try {
    const deviceId = await getDeviceId();
    
    // First try to find by device_id - get most recent if multiple exist
    let { data: deviceSubs, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('device_id', deviceId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error && error.code !== 'PGRST116') throw error;

    let data = deviceSubs?.[0] || null;

    // If no subscription found by device_id, try by user_id
    if (!data) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userSubs, error: userError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans (*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
        
        data = userSubs?.[0] || null;
        if (userError && userError.code !== 'PGRST116') throw userError;
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

export const upgradeSubscription = async (planId: string): Promise<boolean> => {
  try {
    const deviceId = await getDeviceId();
    
    // Cancel existing subscription if any
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('device_id', deviceId)
      .eq('status', 'active');

    // Create new subscription
    const { error } = await supabase
      .from('user_subscriptions')
      .insert([{
        device_id: deviceId,
        plan_id: planId,
        status: 'active'
      }]);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Failed to upgrade subscription", e);
    return false;
  }
};

export const cancelSubscription = async (): Promise<boolean> => {
  try {
    const deviceId = await getDeviceId();
    
    // Cancel by device_id
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('device_id', deviceId)
      .eq('status', 'active');

    if (error) throw error;

    // Also cancel by user_id as fallback (handles cross-device scenarios)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'active');
    }

    return true;
  } catch (e) {
    console.error("Failed to cancel subscription", e);
    return false;
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
    
    // Get the rolling 30-day period (last 30 days from now)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Get current subscription plan
    const { plan } = await getUserSubscription();
    
    // Monthly limits: Free = 3, Premium/Premium Plus = Unlimited (no cap)
    let monthlyLimit = 3; // Default for free users
    let isUnlimited = false;
    if (plan) {
      const planName = plan.name?.toLowerCase().trim().replace(/\s+/g, '_');
      if (planName === 'premium' || planName === 'premium_plus' || 
          planName?.includes('premium') || plan.story_limit === null) {
        // Premium users get unlimited stories
        isUnlimited = true;
        monthlyLimit = 999999; // Effectively unlimited
      } else if (plan.story_limit && plan.story_limit > 0) {
        monthlyLimit = plan.story_limit;
      } else if (plan.features?.daily_stories) {
        monthlyLimit = plan.features.daily_stories;
      }
    }

    // Count stories STARTED in the last 30 days (rolling period)
    // This prevents users from bypassing limits by starting but not finishing stories
    let storiesUsedThisMonth = 0;
    
    // Try to get user for user_stories table (requires authentication)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Count from user_stories table - all stories started in the period
      const { data: userStories, error: storiesError } = await supabase
        .from('user_stories')
        .select('id')
        .eq('user_id', user.id)
        .gte('started_at', thirtyDaysAgo.toISOString())
        .lte('started_at', now.toISOString());

      if (storiesError) throw storiesError;
      storiesUsedThisMonth = userStories?.length || 0;
    } else {
      // Fallback for non-authenticated users: use story_completions with device_id
      const { data: monthStories, error: storiesError } = await supabase
        .from('story_completions')
        .select('id')
        .eq('device_id', deviceId)
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .lte('completed_at', now.toISOString());

      if (storiesError) throw storiesError;
      storiesUsedThisMonth = monthStories?.length || 0;
    }

    // Get bonus stories from referrals and streaks
    const { data: referralData } = await supabase
      .from('referrals')
      .select('bonus_stories_earned')
      .eq('referrer_device_id', deviceId)
      .eq('status', 'completed');

    const { data: streakData } = await supabase
      .from('daily_streaks')
      .select('bonus_stories_earned')
      .eq('device_id', deviceId)
      .single();

    const referralBonus = referralData?.reduce((total, ref) => total + (ref.bonus_stories_earned || 0), 0) || 0;
    const streakBonus = streakData?.bonus_stories_earned || 0;
    const bonusStories = referralBonus + streakBonus;

    const totalAllowed = monthlyLimit + bonusStories;
    const canPlay = storiesUsedThisMonth < totalAllowed;

    console.log(`📊 Story limits: ${storiesUsedThisMonth}/${isUnlimited ? '∞' : monthlyLimit} started in last 30 days (${bonusStories} bonus, canPlay: ${canPlay})`);

    return {
      storiesUsedThisMonth,
      monthlyLimit,
      bonusStories,
      canPlay
    };
  } catch (e) {
    console.error("Failed to check stories remaining", e);
    return {
      storiesUsedThisMonth: 0,
      monthlyLimit: 3,
      bonusStories: 0,
      canPlay: true
    };
  }
};