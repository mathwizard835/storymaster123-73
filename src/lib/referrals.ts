import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/story";

export type Referral = {
  id: string;
  referrer_device_id: string;
  referred_device_id: string;
  referrer_user_id?: string | null;
  referred_user_id?: string | null;
  status: 'pending' | 'completed' | 'expired';
  bonus_stories_earned: number;
  created_at: string;
  completed_at?: string;
};

export const generateReferralCode = async (): Promise<string> => {
  const deviceId = await getDeviceId();
  return deviceId.substring(0, 8).toUpperCase();
};

export const getReferralCode = async (): Promise<string> => {
  return await generateReferralCode();
};

export const createReferral = async (referralCode: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Please sign in to use a referral code" };
    }

    const deviceId = await getDeviceId();
    const referrerCode = referralCode.toUpperCase();
    
    // Find referrer device ID from code (first 8 chars)
    const { data: existingDevices } = await supabase
      .from('referrals')
      .select('referrer_device_id, referrer_user_id')
      .or(`referrer_device_id.ilike.${referrerCode}%`);

    if (!existingDevices || existingDevices.length === 0) {
      return { success: false, message: "Invalid referral code" };
    }

    const referrerDeviceId = existingDevices[0].referrer_device_id;
    const referrerUserId = existingDevices[0].referrer_user_id;

    if (referrerDeviceId === deviceId || referrerUserId === user.id) {
      return { success: false, message: "You cannot refer yourself!" };
    }

    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_device_id', referrerDeviceId)
      .eq('referred_user_id', user.id)
      .maybeSingle();

    if (existing) {
      return { success: false, message: "Referral already exists" };
    }

    const { error } = await supabase
      .from('referrals')
      .insert([{
        referrer_device_id: referrerDeviceId,
        referred_device_id: deviceId,
        referrer_user_id: referrerUserId,
        referred_user_id: user.id,
        status: 'pending'
      }]);

    if (error) throw error;

    return { success: true, message: "Referral code applied! Complete a story to earn both of you bonus stories." };
  } catch (e) {
    console.error("Failed to create referral", e);
    return { success: false, message: "Failed to apply referral code" };
  }
};

export const completeReferral = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (!referral) return;

    await supabase
      .from('referrals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', referral.id);

  } catch (e) {
    console.error("Failed to complete referral", e);
  }
};

export const getReferralStats = async (): Promise<{
  totalReferrals: number;
  completedReferrals: number;
  bonusStoriesEarned: number;
  referralCode: string;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const referralCode = await getReferralCode();

    if (!user) {
      return { totalReferrals: 0, completedReferrals: 0, bonusStoriesEarned: 0, referralCode };
    }

    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', user.id);

    const totalReferrals = referrals?.length || 0;
    const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0;
    const bonusStoriesEarned = referrals?.reduce((total, ref) => total + (ref.bonus_stories_earned || 0), 0) || 0;

    return {
      totalReferrals,
      completedReferrals,
      bonusStoriesEarned,
      referralCode
    };
  } catch (e) {
    console.error("Failed to get referral stats", e);
    return {
      totalReferrals: 0,
      completedReferrals: 0,
      bonusStoriesEarned: 0,
      referralCode: await getReferralCode()
    };
  }
};

export const getShareableReferralLink = async (baseUrl: string): Promise<string> => {
  const code = await getReferralCode();
  return `${baseUrl}?ref=${code}`;
};
