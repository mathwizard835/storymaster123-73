import { supabase } from "@/integrations/supabase/client";
import { updateProgress } from "@/lib/achievements";
import { gainExperience } from "@/lib/character";

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  type: 'tool' | 'key' | 'consumable' | 'document' | 'weapon' | 'potion';
  usable: boolean;
  consumable: boolean;
  icon?: string;
};

export type InteractiveObject = {
  id: string;
  name: string;
  description: string;
  requiresItem?: string;
  actions: string[];
  highlighted?: boolean;
};

export type Profile = {
  age: number;
  reading: string; // apprentice | adventurer | hero
  selectedBadges: string[];
  mode: string; // thrill | comedy | mystery | explore
  storyLength?: 'short' | 'medium' | 'epic';
  topic?: string;
  interests?: string;
  inventory?: InventoryItem[];
};

export type SceneChoice = { 
  id: string; 
  text: string; 
  type?: 'standard' | 'item_use' | 'object_interact';
  requiresItem?: string;
  consumesItem?: boolean;
};

export type Scene = {
  sceneTitle: string;
  hud: { energy: number; time: string; choicePoints: number; ui: string[] };
  narrative: string;
  choices: SceneChoice[];
  interactiveObjects?: InteractiveObject[];
  itemsFound?: InventoryItem[];
  end: boolean;
};

const PROFILE_KEY = "smq.profile";
const DEVICE_ID_KEY = "smq.device_id";
const CURRENT_STORY_KEY = "smq.current_story";
const COMPLETED_STORIES_KEY = "smq.completed_stories";

export type SavedStory = {
  id: string;
  profile: Profile;
  scenes: Scene[];
  currentSceneIndex: number;
  startedAt: string;
  lastPlayedAt: string;
  completed: boolean;
};

export type CompletedStory = {
  id: string;
  title: string;
  profile: Profile;
  completedAt: string;
  sceneCount: number;
  choicesMade: string[];
};

export const saveProfileToLocal = (profile: Profile) => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save profile", e);
  }
};

export const loadProfile = (): Profile | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch (e) {
    console.error("Failed to load profile", e);
    return null;
  }
};

// Get or create a unique device ID for tracking story completions
export const getDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (e) {
    console.error("Failed to get/create device ID", e);
    return crypto.randomUUID(); // Fallback to temporary ID
  }
};

// Check if the player can start a new story based on subscription and daily limits
export const checkStoryLimit = async (): Promise<{ canPlay: boolean; completedCount: number; reason?: string }> => {
  try {
    const { getStoriesRemaining } = await import("@/lib/subscription");
    const { storiesUsedToday, dailyLimit, bonusStories, canPlay } = await getStoriesRemaining();
    
    if (!canPlay) {
      let reason = `You've used ${storiesUsedToday}/${dailyLimit} daily stories.`;
      if (bonusStories > 0) {
        reason += ` (${bonusStories} bonus stories included)`;
      }
      reason += " Upgrade for unlimited stories or wait until tomorrow!";
      
      return { canPlay: false, completedCount: storiesUsedToday, reason };
    }

    return { canPlay: true, completedCount: storiesUsedToday };
  } catch (e) {
    console.error("Failed to check story limit", e);
    return { canPlay: true, completedCount: 0 }; // Allow play on error to avoid blocking
  }
};

// Save current story progress
export const saveCurrentStory = (story: SavedStory): void => {
  try {
    localStorage.setItem(CURRENT_STORY_KEY, JSON.stringify(story));
  } catch (e) {
    console.error("Failed to save current story", e);
  }
};

// Load current story progress
export const loadCurrentStory = (): SavedStory | null => {
  try {
    const raw = localStorage.getItem(CURRENT_STORY_KEY);
    return raw ? (JSON.parse(raw) as SavedStory) : null;
  } catch (e) {
    console.error("Failed to load current story", e);
    return null;
  }
};

// Clear current story progress
export const clearCurrentStory = (): void => {
  try {
    localStorage.removeItem(CURRENT_STORY_KEY);
  } catch (e) {
    console.error("Failed to clear current story", e);
  }
};

// Save completed story to local gallery
export const saveCompletedStory = (completedStory: CompletedStory): void => {
  try {
    const existing = getCompletedStories();
    const updated = [completedStory, ...existing.slice(0, 9)]; // Keep last 10
    localStorage.setItem(COMPLETED_STORIES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save completed story", e);
  }
};

// Get completed stories from local storage
export const getCompletedStories = (): CompletedStory[] => {
  try {
    const raw = localStorage.getItem(COMPLETED_STORIES_KEY);
    return raw ? (JSON.parse(raw) as CompletedStory[]) : [];
  } catch (e) {
    console.error("Failed to load completed stories", e);
    return [];
  }
};

// Mark a story as completed
export const markStoryCompleted = async (
  profile: Profile,
  choiceCount: number = 0
): Promise<{ newAchievements: any[]; characterProgress: any }> => {
  try {
    const deviceId = getDeviceId();
    const { error } = await supabase
      .from('story_completions')
      .insert([
        {
          device_id: deviceId,
          profile: profile,
        },
      ]);

    if (error) throw error;

    // Update streak and complete referral if applicable
    const { updateDailyStreak } = await import("@/lib/streaks");
    const { completeReferral } = await import("@/lib/referrals");
    
    await Promise.all([
      updateDailyStreak(),
      completeReferral()
    ]);

    // Update achievements and character progression
    const newAchievements = updateProgress(profile.selectedBadges, profile.mode, choiceCount);
    const characterProgress = gainExperience(
      profile.selectedBadges,
      profile.mode,
      choiceCount,
      profile.storyLength || 'medium'
    );

    return { newAchievements, characterProgress };
  } catch (e) {
    console.error("Failed to mark story as completed", e);
    return { newAchievements: [], characterProgress: null };
  }
};

// Simple cache for identical requests (5 minute TTL)
const sceneCache = new Map<string, { data: { parsed: Scene | null; text: string }, timestamp: number }>();

export const generateNextScene = async (
  profile: Profile,
  scene?: unknown,
  megastory: boolean = false,
  maxTokens: number = 900,
  sceneCount: number = 1
): Promise<{ text: string; parsed: Scene | null; raw: any }> => {
  // Create cache key for identical requests
  const cacheKey = JSON.stringify({ profile, scene, megastory, maxTokens, sceneCount });
  const cached = sceneCache.get(cacheKey);
  
  // Check cache (5 minute TTL)
  if (cached && Date.now() - cached.timestamp < 300000) {
    console.log("Using cached scene generation");
    return { ...cached.data, raw: null };
  }

  // Smart token calculation based on story type
  const optimizedTokens = maxTokens || (sceneCount === 1 ? 1200 : sceneCount >= 12 ? 800 : 600);
  
  // Adjust max tokens based on story length
  const lengthMultiplier = profile.storyLength === 'short' ? 0.7 : profile.storyLength === 'epic' ? 1.5 : 1;
  const adjustedTokens = Math.floor(optimizedTokens * lengthMultiplier);
  
  const { data, error } = await supabase.functions.invoke("generate-story", {
    body: { profile, scene, megastory, max_tokens: adjustedTokens, scene_count: sceneCount },
  });

  if (error) throw error;
  
  if (!data?.success && !data?.ok) {
    throw new Error(data?.error || "Failed to generate scene");
  }

  const text: string = data?.resultText ?? data?.text ?? "";
  const parsed: Scene | null = data?.result ?? data?.parsed ?? null;
  const result = { text, parsed, raw: data };
  
  // Cache the result
  sceneCache.set(cacheKey, { data: { parsed, text }, timestamp: Date.now() });
  
  // Clean old cache entries (keep only last 10)
  if (sceneCache.size > 10) {
    const oldestKey = Array.from(sceneCache.keys())[0];
    sceneCache.delete(oldestKey);
  }

  return result;
};
