import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const useMobile = () => {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<string>('web');

  useEffect(() => {
    const checkPlatform = () => {
      const native = Capacitor.isNativePlatform();
      const currentPlatform = Capacitor.getPlatform();
      
      setIsNative(native);
      setPlatform(currentPlatform);

      // Configure status bar for mobile
      if (native) {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#1a1a2e' });
        
        // Hide splash screen after app loads
        SplashScreen.hide();
      }
    };

    checkPlatform();
  }, []);

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (isNative) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.log('Haptics not supported');
      }
    }
  };

  const lightHaptic = () => triggerHaptic(ImpactStyle.Light);
  const mediumHaptic = () => triggerHaptic(ImpactStyle.Medium);
  const heavyHaptic = () => triggerHaptic(ImpactStyle.Heavy);

  return {
    isNative,
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    triggerHaptic,
    lightHaptic,
    mediumHaptic,
    heavyHaptic
  };
};