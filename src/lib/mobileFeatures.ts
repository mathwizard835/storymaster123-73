import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Share functionality for mobile
export const shareStory = async (title: string, text: string, url?: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share your adventure!'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  } else {
    // Fallback for web - use native Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(`${title}\n\n${text}${url ? `\n\n${url}` : ''}`);
      alert('Story copied to clipboard!');
    }
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

// Check if running on mobile platform - AGGRESSIVE DETECTION
export const isMobilePlatform = (): boolean => {
  console.log('[MOBILE DETECTION] Starting detection...');
  
  // Method 1: Check if Capacitor object exists at all (most reliable for native apps)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    console.log('[MOBILE DETECTION] Capacitor detected!');
    try {
      const platform = (window as any).Capacitor.getPlatform();
      console.log('[MOBILE DETECTION] Platform:', platform);
      const isMobile = platform === 'ios' || platform === 'android';
      if (isMobile) {
        console.log('[MOBILE DETECTION] ✓ Confirmed native mobile platform');
        return true;
      }
    } catch (error) {
      console.log('[MOBILE DETECTION] Capacitor exists but getPlatform failed, assuming mobile');
      return true; // If Capacitor exists, assume mobile even if getPlatform fails
    }
  }
  
  // Method 2: User agent detection (fallback for early initialization)
  if (typeof navigator !== 'undefined') {
    const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobileUA) {
      console.log('[MOBILE DETECTION] ✓ Mobile detected via user agent');
      return true;
    }
  }
  
  // Method 3: Check for Capacitor in global scope (another fallback)
  if (typeof window !== 'undefined' && 'Capacitor' in window) {
    console.log('[MOBILE DETECTION] ✓ Capacitor in window, assuming mobile');
    return true;
  }
  
  console.log('[MOBILE DETECTION] ✗ No mobile indicators found, assuming web');
  return false;
};

// Get platform information
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};