import { supabase } from '@/integrations/supabase/client';

const VIOLATIONS_KEY = 'content_violations';
const BANNED_KEY = 'user_banned';
const MAX_VIOLATIONS = 3;

interface ViolationRecord {
  count: number;
  lastViolation: string;
}

// Clear old localStorage bans (migration helper)
export const clearLocalStorageBan = (): void => {
  localStorage.removeItem(BANNED_KEY);
  localStorage.removeItem(VIOLATIONS_KEY);
};

// Check if user is banned in database
export const checkDatabaseBan = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.functions.invoke('check-ban-status', {
      body: { 
        userId: user.id,
        email: user.email,
        deviceId: localStorage.getItem('device_id') || user.id
      }
    });

    if (error) {
      console.error('Error checking ban status:', error);
      return false;
    }

    return data?.banned || false;
  } catch (error) {
    console.error('Error checking ban status:', error);
    return false;
  }
};

export const trackViolation = async (): Promise<boolean> => {
  const record = getViolationRecord();
  const newCount = record.count + 1;
  
  const updatedRecord: ViolationRecord = {
    count: newCount,
    lastViolation: new Date().toISOString()
  };
  
  localStorage.setItem(VIOLATIONS_KEY, JSON.stringify(updatedRecord));
  
  if (newCount >= MAX_VIOLATIONS) {
    localStorage.setItem(BANNED_KEY, 'true');
    
    // Also report to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.functions.invoke('manage-bans', {
          body: {
            action: 'ban',
            email: user.email,
            reason: `Automatic ban after ${MAX_VIOLATIONS} content violations`,
            deviceId: localStorage.getItem('device_id') || user.id
          }
        });
      }
    } catch (error) {
      console.error('Error reporting ban to database:', error);
    }
    
    return true;
  }
  
  return false;
};

export const getViolationRecord = (): ViolationRecord => {
  try {
    const stored = localStorage.getItem(VIOLATIONS_KEY);
    if (!stored) return { count: 0, lastViolation: '' };
    return JSON.parse(stored);
  } catch {
    return { count: 0, lastViolation: '' };
  }
};

export const isUserBanned = async (): Promise<boolean> => {
  // Check database first
  const dbBan = await checkDatabaseBan();
  if (dbBan) return true;
  
  // Then check localStorage (for backwards compatibility)
  return localStorage.getItem(BANNED_KEY) === 'true';
};

export const getRemainingAttempts = (): number => {
  const record = getViolationRecord();
  return Math.max(0, MAX_VIOLATIONS - record.count);
};
