import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

interface DeviceContextType {
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isNative: boolean;
  orientation: 'portrait' | 'landscape';
  deviceType: 'phone' | 'tablet' | 'desktop';
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

// Breakpoints
const PHONE_MAX = 767;
const TABLET_MIN = 768;
const TABLET_MAX = 1024;

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [deviceState, setDeviceState] = useState<DeviceContextType>(() => {
    // Initial state - default to desktop for SSR safety
    if (typeof window === 'undefined') {
      return {
        isPhone: false,
        isTablet: false,
        isDesktop: true,
        isNative: false,
        orientation: 'landscape',
        deviceType: 'desktop',
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isPhone: width <= PHONE_MAX,
      isTablet: width >= TABLET_MIN && width <= TABLET_MAX,
      isDesktop: width > TABLET_MAX,
      isNative: checkIsNative(),
      orientation: width > height ? 'landscape' : 'portrait',
      deviceType: getDeviceType(width),
      safeAreaInsets: getSafeAreaInsets(),
    };
  });

  useEffect(() => {
    const updateDeviceState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceState({
        isPhone: width <= PHONE_MAX,
        isTablet: width >= TABLET_MIN && width <= TABLET_MAX,
        isDesktop: width > TABLET_MAX,
        isNative: checkIsNative(),
        orientation: width > height ? 'landscape' : 'portrait',
        deviceType: getDeviceType(width),
        safeAreaInsets: getSafeAreaInsets(),
      });
    };

    // Update on resize
    window.addEventListener('resize', updateDeviceState);
    
    // Update on orientation change
    window.addEventListener('orientationchange', () => {
      // Small delay to let the browser settle after orientation change
      setTimeout(updateDeviceState, 100);
    });
    
    // Initial update
    updateDeviceState();

    return () => {
      window.removeEventListener('resize', updateDeviceState);
      window.removeEventListener('orientationchange', updateDeviceState);
    };
  }, []);

  return (
    <DeviceContext.Provider value={deviceState}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice(): DeviceContextType {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    // Return sensible defaults if used outside provider
    if (typeof window === 'undefined') {
      return {
        isPhone: false,
        isTablet: false,
        isDesktop: true,
        isNative: false,
        orientation: 'landscape',
        deviceType: 'desktop',
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isPhone: width <= PHONE_MAX,
      isTablet: width >= TABLET_MIN && width <= TABLET_MAX,
      isDesktop: width > TABLET_MAX,
      isNative: checkIsNative(),
      orientation: width > height ? 'landscape' : 'portrait',
      deviceType: getDeviceType(width),
      safeAreaInsets: getSafeAreaInsets(),
    };
  }
  return context;
}

function checkIsNative(): boolean {
  try {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const platform = Capacitor.getPlatform();
      return platform === 'ios' || platform === 'android';
    }
  } catch (error) {
    console.warn('[DeviceContext] Failed to check native platform:', error);
  }
  return false;
}

function getDeviceType(width: number): 'phone' | 'tablet' | 'desktop' {
  if (width <= PHONE_MAX) return 'phone';
  if (width >= TABLET_MIN && width <= TABLET_MAX) return 'tablet';
  return 'desktop';
}

function getSafeAreaInsets() {
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  const root = document.documentElement;
  const style = getComputedStyle(root);
  
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0', 10) || 0,
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0', 10) || 0,
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0', 10) || 0,
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0', 10) || 0,
  };
}

export { DeviceContext };
