import { Capacitor } from '@capacitor/core';

// Lazy-load push notifications to avoid errors on web
const getPushModule = async () => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor/push-notifications');
    return mod.PushNotifications;
  } catch {
    console.warn('[PUSH] Push notifications not available');
    return null;
  }
};

export const initPushNotifications = async (): Promise<void> => {
  const PushNotifications = await getPushModule();
  if (!PushNotifications) return;

  try {
    const permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      const result = await PushNotifications.requestPermissions();
      if (result.receive !== 'granted') {
        console.log('[PUSH] Permission denied');
        return;
      }
    } else if (permStatus.receive !== 'granted') {
      console.log('[PUSH] Permission not granted');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      console.log('[PUSH] Registered with token:', token.value);
      // Store token for server-side notifications
      localStorage.setItem('push-token', token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[PUSH] Registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[PUSH] Notification received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[PUSH] Notification action:', action);
      // Handle deep links from notifications
      const data = action.notification.data;
      if (data?.route) {
        window.location.href = data.route;
      }
    });

    console.log('[PUSH] Initialized successfully');
  } catch (error) {
    console.error('[PUSH] Init error:', error);
  }
};
