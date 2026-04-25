import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from '@/lib/platform';

// Enhanced local storage for mobile with fallback to web localStorage
export const mobileStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },
  
  async getItem(key: string): Promise<string | null> {
    if (isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  async clear(): Promise<void> {
    if (isNativePlatform()) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  }
};