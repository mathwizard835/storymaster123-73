import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Canonical public URL for any link sent to other people.
// window.location.origin is unsafe inside Capacitor (capacitor://localhost)
// and inside lovable preview subdomains, so default to the production domain.
export const getPublicShareBaseUrl = (): string => {
  if (typeof window === 'undefined') return 'https://storymaster.app';
  const { origin } = window.location;
  if (origin.startsWith('https://storymaster.app')) return origin;
  return 'https://storymaster.app';
};

const isCancelError = (error: unknown): boolean => {
  if (!error) return false;
  const err = error as { name?: string; message?: string; code?: string };
  const name = (err.name || '').toLowerCase();
  const message = (err.message || '').toLowerCase();
  const code = (err.code || '').toString().toLowerCase();
  return (
    name === 'aborterror' ||
    message.includes('cancel') ||
    message.includes('dismiss') ||
    code.includes('cancel')
  );
};

// Share functionality for mobile.
// Throws on real failures so callers can fall back (e.g. clipboard copy).
// Silently resolves when the user cancels the share sheet.
export const shareStory = async (title: string, text: string, url?: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share your adventure!'
      });
      return;
    } catch (error) {
      if (isCancelError(error)) return;
      console.error('Error sharing (native):', error);
      throw error;
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if (isCancelError(error)) return;
      console.error('Error sharing (web):', error);
      throw error;
    }
  }

  // No share sheet available — copy to clipboard as a last resort.
  try {
    await navigator.clipboard.writeText(`${title}\n\n${text}${url ? `\n\n${url}` : ''}`);
  } catch (error) {
    console.error('Clipboard fallback failed:', error);
    throw error;
  }
};

// Haptic feedback for mobile interactions
export const addHapticFeedback = (style: 'light' | 'medium' | 'heavy' = 'light'): void => {
  if (Capacitor.isNativePlatform()) {
    try {
      const impactStyle = style === 'light' ? ImpactStyle.Light : 
                         style === 'medium' ? ImpactStyle.Medium : 
                         ImpactStyle.Heavy;
      Haptics.impact({ style: impactStyle });
    } catch (error) {
      console.error('Error with haptic feedback:', error);
    }
  }
};

// Status bar customization
export const setStatusBarStyle = async (style: 'light' | 'dark' = 'dark'): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ 
        style: style === 'light' ? Style.Light : Style.Dark 
      });
    } catch (error) {
      console.error('Error setting status bar style:', error);
    }
  }
};

// Check if running on mobile platform - PRODUCTION READY
export const isMobilePlatform = (): boolean => {
  // Method 1: Capacitor platform check (most reliable)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    try {
      const platform = Capacitor.getPlatform();
      return platform === 'ios' || platform === 'android';
    } catch (error) {
      console.warn('[MOBILE] Capacitor detected but getPlatform failed:', error);
      return false;
    }
  }
  
  // Method 2: User agent fallback
  if (typeof navigator !== 'undefined') {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  
  return false;
};

// Get platform information
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

// Tablet device detection with fallback safety
export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const platform = (window as any).Capacitor?.getPlatform?.() || '';
  const width = window.innerWidth;

  const isIpad = /iPad/.test(ua) || (platform === 'ios' && navigator.maxTouchPoints > 2);
  const isAndroidTablet = /Android/.test(ua) && !/Mobile/.test(ua);

  return (isIpad || isAndroidTablet) && width >= 820 && width <= 1024;
};