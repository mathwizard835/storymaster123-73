import { supabase } from '@/integrations/supabase/client';
import { mobileStorage } from './mobileStorage';

/**
 * Track a content violation in the database for manual admin review
 * No automatic banning - all enforcement is manual through Supabase
 */
export const trackViolation = async (userId?: string, deviceId?: string): Promise<void> => {
  try {
    const finalDeviceId = deviceId || await mobileStorage.getItem('device_id') || 'unknown';
    
    // Record the violation in the database for admin review
    const { error: violationError } = await supabase
      .from('content_violations')
      .insert({
        user_id: userId || null,
        device_id: finalDeviceId,
        violation_type: 'inappropriate_content',
      });

    if (violationError) {
      console.error('Error recording violation:', violationError);
    }
  } catch (error) {
    console.error('Error in trackViolation:', error);
  }
};
