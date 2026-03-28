import { supabase } from '@/integrations/supabase/client';

/**
 * Check if an email is banned using a secure RPC (no direct table access)
 * Returns true if banned, false otherwise
 */
export const checkIfBanned = async (email: string): Promise<{ isBanned: boolean; reason?: string }> => {
  try {
    const { data, error } = await supabase.rpc('check_email_banned', {
      p_email: email.toLowerCase(),
    });

    if (error) {
      console.error('Error checking ban status:', error);
      return { isBanned: false };
    }

    const result = data as unknown as { is_banned: boolean; reason?: string } | null;

    if (result?.is_banned) {
      return {
        isBanned: true,
        reason: result.reason || 'Your account has been suspended.',
      };
    }

    return { isBanned: false };
  } catch (error) {
    console.error('Error in checkIfBanned:', error);
    return { isBanned: false };
  }
};
