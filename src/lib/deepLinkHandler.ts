import { App as CapApp, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/**
 * Initialize deep link handling for native platforms.
 * When iOS opens the app via a Universal Link (e.g. Supabase auth callback),
 * this extracts the auth tokens from the URL and sets the Supabase session.
 */
export function initDeepLinkHandler(navigate: (path: string) => void) {
  if (!Capacitor.isNativePlatform()) return;

  CapApp.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    console.log('[DeepLink] App opened with URL:', event.url);

    try {
      const url = new URL(event.url);

      // Extract hash fragment (Supabase puts tokens in the hash)
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      // Also check query params (some flows use query params)
      const queryParams = new URLSearchParams(url.search);
      const queryAccessToken = queryParams.get('access_token');
      const queryRefreshToken = queryParams.get('refresh_token');
      const queryType = queryParams.get('type');

      const finalAccessToken = accessToken || queryAccessToken;
      const finalRefreshToken = refreshToken || queryRefreshToken;
      const finalType = type || queryType;

      if (finalAccessToken && finalRefreshToken) {
        console.log('[DeepLink] Found auth tokens, type:', finalType);

        // Set the session using the tokens from the URL
        const { data, error } = await supabase.auth.setSession({
          access_token: finalAccessToken,
          refresh_token: finalRefreshToken,
        });

        if (error) {
          console.error('[DeepLink] Failed to set session:', error);
          return;
        }

        console.log('[DeepLink] Session set successfully for user:', data.user?.id);

        // Navigate based on the auth type
        if (finalType === 'recovery') {
          navigate('/reset-password');
        } else if (finalType === 'signup' || finalType === 'email_change') {
          navigate('/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        // No auth tokens — just navigate to the path
        const path = url.pathname || '/';
        console.log('[DeepLink] No auth tokens, navigating to:', path);
        navigate(path);
      }
    } catch (err) {
      console.error('[DeepLink] Error handling deep link:', err);
    }
  });
}
