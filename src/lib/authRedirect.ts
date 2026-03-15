import { Capacitor } from '@capacitor/core';

/** Published web domain — Universal Links will intercept this on iOS if the app is installed */
const PUBLISHED_DOMAIN = 'https://storymaster123-73.lovable.app';

/**
 * Returns the correct redirect URL for Supabase auth callbacks.
 * On native platforms, uses the published domain so Universal Links can intercept.
 * On web, uses the current origin.
 */
export function getAuthRedirectUrl(path: string = '/auth'): string {
  if (Capacitor.isNativePlatform()) {
    return `${PUBLISHED_DOMAIN}${path}`;
  }
  return `${window.location.origin}${path}`;
}
