import { useCallback } from 'react';
import { addHapticFeedback, isMobilePlatform } from '@/lib/mobileFeatures';

// Enhanced mobile hook with haptic feedback and platform detection
export const useMobileInteraction = () => {
  const isNative = isMobilePlatform();

  const handleTouch = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (isNative) {
      addHapticFeedback(intensity);
    }
  }, [isNative]);

  const handleButtonPress = useCallback(() => {
    handleTouch('light');
  }, [handleTouch]);

  const handleChoice = useCallback(() => {
    handleTouch('medium');
  }, [handleTouch]);

  const handleSuccess = useCallback(() => {
    handleTouch('heavy');
  }, [handleTouch]);

  return {
    isNative,
    handleTouch,
    handleButtonPress,
    handleChoice,
    handleSuccess
  };
};