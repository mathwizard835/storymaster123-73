import { supabase } from '@/integrations/supabase/client';
import { mobileStorage } from './mobileStorage';

const MAX_VIOLATIONS = 3;

/**
 * Track a content violation in the database
 * Returns true if the user is now banned
 */
export const trackViolation = async (userId?: string, deviceId?: string): Promise<boolean> => {
  try {
    // Record the violation in the database
    const { error: violationError } = await supabase
      .from('content_violations')
      .insert({
        user_id: userId || null,
        device_id: deviceId || await mobileStorage.getItem('device_id') || 'unknown',
        violation_type: 'inappropriate_content',
      });

    if (violationError) {
      console.error('Error recording violation:', violationError);
    }

    // Check violation count
    const { data: violations, error: countError } = await supabase
      .from('content_violations')
      .select('id')
      .or(`device_id.eq.${deviceId || 'unknown'},user_id.eq.${userId || 'null'}`);

    if (countError) {
      console.error('Error counting violations:', countError);
      return false;
    }

    const violationCount = violations?.length || 0;

    // If reached max violations, ban the user
    if (violationCount >= MAX_VIOLATIONS) {
      const { error: banError } = await supabase
        .from('banned_users')
        .insert({
          user_id: userId || null,
          device_id: deviceId || await mobileStorage.getItem('device_id') || 'unknown',
          email: '', // Will be populated by admin
          reason: 'Exceeded maximum content violations',
        });

      if (banError) {
        console.error('Error creating ban:', banError);
      }

      return true; // User is now banned
    }

    return false; // User is not banned yet
  } catch (error) {
    console.error('Error in trackViolation:', error);
    return false;
  }
};

/**
 * Check if a user or device is banned
 */
export const isUserBanned = async (userId?: string, deviceId?: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_banned', {
      _user_id: userId || null,
      _device_id: deviceId || await mobileStorage.getItem('device_id') || null,
    });

    if (error) {
      console.error('Error checking ban status:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in isUserBanned:', error);
    return false;
  }
};

/**
 * Get remaining attempts before ban
 */
export const getRemainingAttempts = async (userId?: string, deviceId?: string): Promise<number> => {
  try {
    const { data: violations, error } = await supabase
      .from('content_violations')
      .select('id')
      .or(`device_id.eq.${deviceId || 'unknown'},user_id.eq.${userId || 'null'}`);

    if (error) {
      console.error('Error getting violations:', error);
      return MAX_VIOLATIONS;
    }

    const violationCount = violations?.length || 0;
    return Math.max(0, MAX_VIOLATIONS - violationCount);
  } catch (error) {
    console.error('Error in getRemainingAttempts:', error);
    return MAX_VIOLATIONS;
  }
};
