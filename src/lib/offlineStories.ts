import { mobileStorage } from './mobileStorage';
import { type DatabaseStory } from './databaseStory';

const OFFLINE_STORIES_KEY = 'smq.offline_stories';
const OFFLINE_TIMESTAMP_KEY = 'smq.offline_stories_timestamp';

// Cache completed stories locally for offline access
export const cacheStoriesOffline = async (stories: DatabaseStory[]): Promise<void> => {
  try {
    await mobileStorage.setItem(OFFLINE_STORIES_KEY, JSON.stringify(stories));
    await mobileStorage.setItem(OFFLINE_TIMESTAMP_KEY, Date.now().toString());
    console.log(`📦 Cached ${stories.length} stories for offline access`);
  } catch (e) {
    console.error('Failed to cache stories offline:', e);
  }
};

// Load cached stories from local storage (offline fallback)
export const loadOfflineStories = async (): Promise<DatabaseStory[]> => {
  try {
    const raw = await mobileStorage.getItem(OFFLINE_STORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load offline stories:', e);
    return [];
  }
};

// Check if offline cache exists and return age in minutes
export const getOfflineCacheAge = async (): Promise<number | null> => {
  try {
    const timestamp = await mobileStorage.getItem(OFFLINE_TIMESTAMP_KEY);
    if (!timestamp) return null;
    return (Date.now() - parseInt(timestamp)) / 60000;
  } catch {
    return null;
  }
};

// Check if device is online
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};
