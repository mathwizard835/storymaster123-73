import { supabase } from '@/integrations/supabase/client';

/**
 * Check if an email or user is banned
 * Returns true if banned, false otherwise
 */
export const checkIfBanned = async (email: string): Promise<{ isBanned: boolean; reason?: string }> => {
  try {
    // Check banned_users table by email
    const { data: bannedUser, error } = await supabase
      .from('banned_users')
      .select('email, reason, expires_at')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error checking ban status:', error);
      return { isBanned: false };
    }

    if (bannedUser) {
      // Check if ban has expired
      if (bannedUser.expires_at) {
        const expiresAt = new Date(bannedUser.expires_at);
        if (expiresAt < new Date()) {
          // Ban has expired
          return { isBanned: false };
        }
      }
      // Active ban found
      return { 
        isBanned: true, 
        reason: bannedUser.reason || 'Your account has been suspended.' 
      };
    }

    return { isBanned: false };
  } catch (error) {
    console.error('Error in checkIfBanned:', error);
    return { isBanned: false };
  }
};
