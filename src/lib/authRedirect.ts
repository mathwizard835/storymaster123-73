import { Capacitor } from '@capacitor/core';

/** Published web domain — use this for web auth redirects */
const PUBLISHED_DOMAIN = 'https://storymaster123-73.lovable.app';
const NATIVE_SCHEME = 'storymasterquest://';

/**
 * Returns the correct redirect URL for Supabase auth callbacks.
 * Native builds use the app URL scheme so callbacks reopen the app.
 * Web builds use the published domain so callbacks avoid preview/editor URLs.
 */
export function getAuthRedirectUrl(path: string = '/auth'): string {
  if (Capacitor.isNativePlatform()) {
    return `${NATIVE_SCHEME}${path.replace(/^\//, '')}`;
  }

  return `${PUBLISHED_DOMAIN}${path}`;
}
