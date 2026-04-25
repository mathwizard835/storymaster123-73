import { Capacitor } from '@capacitor/core';

const NATIVE_PLATFORM_MARKER = 'storymaster.nativePlatform';

let nativePlatformDetected = false;

export function isNativePlatform(): boolean {
  try {
    if (nativePlatformDetected) return true;
    if (typeof window === 'undefined') return false;

    const bridge = (window as any).Capacitor;
    const capacitorPlatform = Capacitor.getPlatform?.();
    const bridgePlatform = bridge?.getPlatform?.() ?? bridge?.platform;
    const protocol = window.location.protocol;
    const storedNativeMarker = window.localStorage?.getItem(NATIVE_PLATFORM_MARKER) === 'true';

    const isNative =
      Capacitor.isNativePlatform?.() === true ||
      capacitorPlatform === 'ios' ||
      capacitorPlatform === 'android' ||
      bridge?.isNativePlatform?.() === true ||
      bridgePlatform === 'ios' ||
      bridgePlatform === 'android' ||
      protocol === 'capacitor:' ||
      protocol === 'ionic:' ||
      storedNativeMarker;

    if (isNative) {
      nativePlatformDetected = true;
      window.localStorage?.setItem(NATIVE_PLATFORM_MARKER, 'true');
    }

    return isNative;
  } catch {
    return nativePlatformDetected;
  }
}