import { Capacitor } from '@capacitor/core';

let LocalNotifications: any = null;

const loadPlugin = async () => {
  if (!Capacitor.isNativePlatform()) return null;
  if (!LocalNotifications) {
    try {
      const mod = await import('@capacitor/local-notifications');
      LocalNotifications = mod.LocalNotifications;
    } catch {
      console.warn('Local notifications plugin not available');
      return null;
    }
  }
  return LocalNotifications;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  const plugin = await loadPlugin();
  if (!plugin) return false;
  try {
    const result = await plugin.requestPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
};

export const scheduleStreakReminder = async (): Promise<void> => {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    // Cancel existing streak reminders first
    await plugin.cancel({ notifications: [{ id: 1001 }, { id: 1002 }] }).catch(() => {});

    const tomorrow6pm = new Date();
    tomorrow6pm.setDate(tomorrow6pm.getDate() + 1);
    tomorrow6pm.setHours(18, 0, 0, 0);

    await plugin.schedule({
      notifications: [
        {
          id: 1001,
          title: '📚 Keep Your Streak Going!',
          body: "Don't forget to read a story today! Your streak is counting on you.",
          schedule: { at: tomorrow6pm, allowWhileIdle: true },
          sound: 'default',
          actionTypeId: 'STREAK_REMINDER',
        },
      ],
    });
    console.log('✅ Streak reminder scheduled');
  } catch (e) {
    console.error('Failed to schedule streak reminder:', e);
  }
};

export const scheduleRetentionNotification = async (): Promise<void> => {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.cancel({ notifications: [{ id: 2001 }] }).catch(() => {});

    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    threeDaysLater.setHours(16, 0, 0, 0);

    await plugin.schedule({
      notifications: [
        {
          id: 2001,
          title: '🌟 A New Adventure Awaits!',
          body: 'StoryMaster Kids has new stories waiting for you. Come back and explore!',
          schedule: { at: threeDaysLater, allowWhileIdle: true },
          sound: 'default',
          actionTypeId: 'RETENTION',
        },
      ],
    });
    console.log('✅ Retention notification scheduled');
  } catch (e) {
    console.error('Failed to schedule retention notification:', e);
  }
};

export const cancelAllNotifications = async (): Promise<void> => {
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    const pending = await plugin.getPending();
    if (pending.notifications.length > 0) {
      await plugin.cancel({ notifications: pending.notifications });
    }
  } catch (e) {
    console.error('Failed to cancel notifications:', e);
  }
};
