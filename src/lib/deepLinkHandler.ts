import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const SUPPORTED_OTP_TYPES: EmailOtpType[] = ['signup', 'recovery', 'invite', 'email_change', 'magiclink'];

function isSupportedOtpType(value: string | null): value is EmailOtpType {
  return !!value && SUPPORTED_OTP_TYPES.includes(value as EmailOtpType);
}

function navigateAfterAuth(type: string | null, navigate: (path: string) => void) {
  if (type === 'recovery' || type === 'invite') {
    navigate('/reset-password');
    return;
  }

  navigate('/dashboard');
}

/**
 * Initialize deep link handling for native platforms.
 * When iOS opens the app via a Universal Link (e.g. Supabase auth callback),
 * this extracts auth params from the URL and finalizes the session.
 */
export async function initDeepLinkHandler(navigate: (path: string) => void) {
  let Capacitor: typeof import('@capacitor/core').Capacitor;
  try {
    const core = await import('@capacitor/core');
    Capacitor = core.Capacitor;
  } catch {
    return;
  }

  if (!Capacitor.isNativePlatform()) return;

  const { App: CapApp } = await import('@capacitor/app');

  CapApp.addListener('appUrlOpen', async (event) => {
    console.log('[DeepLink] App opened with URL:', event.url);

    try {
      const url = new URL(event.url);
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const queryParams = new URLSearchParams(url.search);

      const finalAccessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const finalRefreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const finalType = hashParams.get('type') || queryParams.get('type');
      const finalTokenHash = hashParams.get('token_hash') || queryParams.get('token_hash');

      if (finalAccessToken && finalRefreshToken) {
        console.log('[DeepLink] Found session tokens, type:', finalType);

        const { data, error } = await supabase.auth.setSession({
          access_token: finalAccessToken,
          refresh_token: finalRefreshToken,
        });

        if (error) {
          console.error('[DeepLink] Failed to set session:', error);
          return;
        }

        console.log('[DeepLink] Session set successfully for user:', data.user?.id);
        navigateAfterAuth(finalType, navigate);
        return;
      }

      if (finalTokenHash && isSupportedOtpType(finalType)) {
        console.log('[DeepLink] Verifying OTP link in native app, type:', finalType);

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: finalTokenHash,
          type: finalType,
        });

        if (error) {
          console.error('[DeepLink] Failed to verify OTP token:', error);
          return;
        }

        console.log('[DeepLink] OTP verified for user:', data.user?.id);
        navigateAfterAuth(finalType, navigate);
        return;
      }

      const path = (url.pathname && url.pathname !== '/') ? url.pathname : (url.host ? `/${url.host}` : '/');
      console.log('[DeepLink] No auth params, navigating to:', path);
      navigate(path);
    } catch (err) {
      console.error('[DeepLink] Error handling deep link:', err);
    }
  });
}
