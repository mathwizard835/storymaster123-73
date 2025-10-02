const VIOLATIONS_KEY = 'content_violations';
const BANNED_KEY = 'user_banned';
const MAX_VIOLATIONS = 3;

interface ViolationRecord {
  count: number;
  lastViolation: string;
}

export const trackViolation = (): boolean => {
  const record = getViolationRecord();
  const newCount = record.count + 1;
  
  const updatedRecord: ViolationRecord = {
    count: newCount,
    lastViolation: new Date().toISOString()
  };
  
  localStorage.setItem(VIOLATIONS_KEY, JSON.stringify(updatedRecord));
  
  if (newCount >= MAX_VIOLATIONS) {
    localStorage.setItem(BANNED_KEY, 'true');
    return true; // User is now banned
  }
  
  return false; // User is not banned yet
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

export const isUserBanned = (): boolean => {
  return localStorage.getItem(BANNED_KEY) === 'true';
};

export const getRemainingAttempts = (): number => {
  const record = getViolationRecord();
  return Math.max(0, MAX_VIOLATIONS - record.count);
};
