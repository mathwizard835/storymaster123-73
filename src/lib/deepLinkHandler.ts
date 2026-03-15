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

async function handleDeepLinkUrl(urlString: string, navigate: (path: string) => void) {
  console.log('[DeepLink] Processing URL:', urlString);

  const url = new URL(urlString);
  const hashParams = new URLSearchParams(url.hash.substring(1));
  const queryParams = new URLSearchParams(url.search);

  const finalAccessToken = hashParams.get('access_token') || queryParams.get('access_token');
  const finalRefreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
  const finalType = hashParams.get('type') || queryParams.get('type');
  const finalTokenHash = hashParams.get('token_hash') || queryParams.get('token_hash');
  const finalCode = queryParams.get('code');

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

  if (finalCode) {
    console.log('[DeepLink] Exchanging auth code for session, type:', finalType);

    const { data, error } = await supabase.auth.exchangeCodeForSession(finalCode);

    if (error) {
      console.error('[DeepLink] Failed to exchange auth code:', error);
      return;
    }

    console.log('[DeepLink] Session created from code for user:', data.session?.user?.id);
    navigateAfterAuth(finalType, navigate);
    return;
  }

  const path = (url.pathname && url.pathname !== '/') ? url.pathname : (url.host ? `/${url.host}` : '/');
  console.log('[DeepLink] No auth params, navigating to:', path);
  navigate(path);
}

/**
 * Initialize deep link handling for native platforms.
 * Handles both warm opens (appUrlOpen) and cold starts (getLaunchUrl).
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

  try {
    const launchUrl = await CapApp.getLaunchUrl();
    if (launchUrl?.url) {
      await handleDeepLinkUrl(launchUrl.url, navigate);
    }
  } catch (err) {
    console.error('[DeepLink] Error handling launch URL:', err);
  }

  CapApp.addListener('appUrlOpen', async (event) => {
    try {
      await handleDeepLinkUrl(event.url, navigate);
    } catch (err) {
      console.error('[DeepLink] Error handling deep link:', err);
    }
  });
}
