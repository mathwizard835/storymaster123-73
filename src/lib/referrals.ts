import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/story";

export type Referral = {
  id: string;
  referrer_device_id: string;
  referred_device_id: string;
  status: 'pending' | 'completed' | 'expired';
  bonus_stories_earned: number;
  created_at: string;
  completed_at?: string;
};

export const generateReferralCode = (): string => {
  const deviceId = getDeviceId();
  // Create a short, shareable code from device ID
  return deviceId.substring(0, 8).toUpperCase();
};

export const getReferralCode = (): string => {
  return generateReferralCode();
};

export const createReferral = async (referralCode: string): Promise<{ success: boolean; message: string }> => {
  try {
    const deviceId = getDeviceId();
    const referrerCode = referralCode.toUpperCase();
    
    // Find referrer device ID from code (first 8 chars)
    const { data: existingDevices } = await supabase
      .from('referrals')
      .select('referrer_device_id')
      .or(`referrer_device_id.ilike.${referrerCode}%`);

    if (!existingDevices || existingDevices.length === 0) {
      return { success: false, message: "Invalid referral code" };
    }

    const referrerDeviceId = existingDevices[0].referrer_device_id;

    // Prevent self-referral
    if (referrerDeviceId === deviceId) {
      return { success: false, message: "You cannot refer yourself!" };
    }

    // Check if referral already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_device_id', referrerDeviceId)
      .eq('referred_device_id', deviceId)
      .single();

    if (existing) {
      return { success: false, message: "Referral already exists" };
    }

    // Create referral
    const { error } = await supabase
      .from('referrals')
      .insert([{
        referrer_device_id: referrerDeviceId,
        referred_device_id: deviceId,
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
    const deviceId = getDeviceId();

    // Find pending referral for this user
    const { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_device_id', deviceId)
      .eq('status', 'pending')
      .single();

    if (!referral) return;

    // Mark referral as completed
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
    const deviceId = getDeviceId();
    
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_device_id', deviceId);

    const totalReferrals = referrals?.length || 0;
    const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0;
    const bonusStoriesEarned = referrals?.reduce((total, ref) => total + (ref.bonus_stories_earned || 0), 0) || 0;

    return {
      totalReferrals,
      completedReferrals,
      bonusStoriesEarned,
      referralCode: getReferralCode()
    };
  } catch (e) {
    console.error("Failed to get referral stats", e);
    return {
      totalReferrals: 0,
      completedReferrals: 0,
      bonusStoriesEarned: 0,
      referralCode: getReferralCode()
    };
  }
};

export const getShareableReferralLink = (baseUrl: string): string => {
  const code = getReferralCode();
  return `${baseUrl}?ref=${code}`;
};