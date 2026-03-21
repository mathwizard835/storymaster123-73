import { Capacitor } from '@capacitor/core';

/** Published web domain — always use this for auth redirects */
const PUBLISHED_DOMAIN = 'https://storymaster123-73.lovable.app';

/**
 * Returns the correct redirect URL for Supabase auth callbacks.
 * Always uses the published domain so users land on the real app,
 * not the Lovable preview/editor URL.
 */
export function getAuthRedirectUrl(path: string = '/auth'): string {
  return `${PUBLISHED_DOMAIN}${path}`;
}
