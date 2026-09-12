import { isNativePlatform } from '@/lib/platform';

/** Published web domain — use this for web auth redirects */
const PUBLISHED_DOMAIN = 'https://storymaster.app';
const NATIVE_SCHEME = 'storymasterquest://';

/**
 * Returns the correct redirect URL for Supabase auth callbacks.
 * Native builds use the app URL scheme so callbacks reopen the app.
 * Web builds use the custom domain so sender domain and link domain match,
 * which improves email deliverability (SPF/DKIM/DMARC alignment).
 */
export function getAuthRedirectUrl(path: string = '/auth'): string {
  if (isNativePlatform()) {
    return `${NATIVE_SCHEME}${path.replace(/^\//, '')}`;
  }

  return `${PUBLISHED_DOMAIN}${path}`;
}

