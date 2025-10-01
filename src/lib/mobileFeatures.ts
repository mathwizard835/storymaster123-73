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