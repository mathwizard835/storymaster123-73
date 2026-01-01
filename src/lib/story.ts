import { supabase } from "@/integrations/supabase/client";
import { updateProgress } from "@/lib/achievements";
import { gainExperience } from "@/lib/character";
import { mobileStorage } from "@/lib/mobileStorage";
// ABILITIES DISABLED - Uncomment to re-enable
// import { checkAndAwardAbilities } from "@/lib/abilities";

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
  name?: string;
  age: number;
  lexileScore: number; // Lexile score (200-1200)
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
  type?: 'standard' | 'item_use' | 'object_interact' | 'secret';
  requiresItem?: string;
  consumesItem?: boolean;
  requiresAbility?: string; // Ability category or name required for Secret choices
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
  choicesMade: number; // Track number of choices made
  quizTaken?: boolean;
  quizScore?: number;
};

export type CompletedStory = {
  id: string;
  title: string;
  profile: Profile;
  completedAt: string;
  sceneCount: number;
  choicesMade: string[];
};

export const saveProfileToLocal = async (profile: Profile) => {
  try {
    // Clear any inventory when saving a new profile to ensure fresh start
    profile.inventory = [];
    await mobileStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    console.log("Profile saved - fresh configuration:", profile);
  } catch (e) {
    console.error("Failed to save profile", e);
  }
};

export const loadProfile = async (): Promise<Profile | null> => {
  try {
    const raw = await mobileStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch (e) {
    console.error("Failed to load profile", e);
    return null;
  }
};

// Clear profile completely from storage
export const clearProfile = async (): Promise<void> => {
  try {
    await mobileStorage.removeItem(PROFILE_KEY);
    console.log("Profile cleared - ready for fresh start");
  } catch (e) {
    console.error("Failed to clear profile", e);
  }
};

// Get or create a unique device ID for tracking story completions
export const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await mobileStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await mobileStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (e) {
    console.error("Failed to get/create device ID", e);
    return crypto.randomUUID(); // Fallback to temporary ID
  }
};

// Check if the player can start a new story based on subscription and monthly limits
export const checkStoryLimit = async (): Promise<{ canPlay: boolean; completedCount: number; reason?: string }> => {
  try {
    const { getStoriesRemaining } = await import("@/lib/subscription");
    const { storiesUsedThisMonth, monthlyLimit, bonusStories, canPlay } = await getStoriesRemaining();
    
    if (!canPlay) {
      let reason = `You've used ${storiesUsedThisMonth}/${monthlyLimit} monthly stories.`;
      if (bonusStories > 0) {
        reason += ` (${bonusStories} bonus stories included)`;
      }
      reason += " Upgrade to Premium for 10 stories per month or wait until next month!";
      
      return { canPlay: false, completedCount: storiesUsedThisMonth, reason };
    }


    return { canPlay: true, completedCount: storiesUsedThisMonth };
  } catch (e) {
    console.error("Failed to check story limit", e);
    return { canPlay: true, completedCount: 0 }; // Allow play on error to avoid blocking
  }
};

// Save current story progress
export const saveCurrentStory = async (story: SavedStory): Promise<void> => {
  try {
    await mobileStorage.setItem(CURRENT_STORY_KEY, JSON.stringify(story));
  } catch (e) {
    console.error("Failed to save current story", e);
  }
};

// Load current story progress
export const loadCurrentStory = async (): Promise<SavedStory | null> => {
  try {
    const raw = await mobileStorage.getItem(CURRENT_STORY_KEY);
    return raw ? (JSON.parse(raw) as SavedStory) : null;
  } catch (e) {
    console.error("Failed to load current story", e);
    return null;
  }
};

// Clear current story progress
export const clearCurrentStory = async (): Promise<void> => {
  try {
    await mobileStorage.removeItem(CURRENT_STORY_KEY);
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
  choiceCount: number = 0,
  qualityMetrics?: {
    quizScore?: number;
    strategicChoices?: number;
    ultraChoicesUsed?: number;
    scenes?: Scene[];
  }
): Promise<{ newAchievements: any[]; characterProgress: any; newAbilities: any[] }> => {
  try {
    const deviceId = await getDeviceId();
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
    
    // ABILITIES DISABLED - Uncomment to re-enable
    // Check and award abilities based on story completion with quality metrics
    // const scenes = qualityMetrics?.scenes || [];
    // const newAbilities = checkAndAwardAbilities(
    //   profile.selectedBadges,
    //   choiceCount,
    //   true,
    //   profile,
    //   {
    //     quizScore: qualityMetrics?.quizScore,
    //     strategicChoices: qualityMetrics?.strategicChoices || scenes.filter(s => 
    //       s.interactiveObjects?.some(obj => obj.highlighted) || 
    //       (s.itemsFound && s.itemsFound.length > 0)
    //     ).length,
    //     ultraChoicesUsed: qualityMetrics?.ultraChoicesUsed || scenes.filter(s => 
    //       s.choices.some(c => c.type === 'secret')
    //     ).length
    //   }
    // );
    const newAbilities: any[] = []; // Placeholder for disabled abilities

    return { newAchievements, characterProgress, newAbilities };
  } catch (e) {
    console.error("Failed to mark story as completed", e);
    return { newAchievements: [], characterProgress: null, newAbilities: [] };
  }
};

// Simple cache for identical requests (5 minute TTL)
const sceneCache = new Map<string, { data: { parsed: Scene | null; text: string }, timestamp: number, storyId: string }>();

// Track current story session to prevent cross-story cache contamination
let currentStoryId: string | null = null;

export const clearSceneCache = () => {
  sceneCache.clear();
  currentStoryId = null;
  console.log("Scene cache cleared");
};

// Phase 3: Story session recovery function
export const recoverStorySession = (storyId: string, currentScene: number) => {
  console.log(`🔧 Recovering story session: ${storyId} at scene ${currentScene}`);
  currentStoryId = storyId;
  // Don't clear cache - keep existing scene data
};

export const generateNextScene = async (
  profile: Profile,
  scene?: unknown,
  megastory: boolean = false,
  maxTokens: number = 900,
  sceneCount: number = 1,
  storyId?: string,
  forceNewSession: boolean = false,
  availableAbilities: string[] = []
): Promise<{ text: string; parsed: Scene | null; raw: any }> => {
  // Phase 4: Defensive logging
  console.log(`🎬 generateNextScene called:`, {
    sceneCount,
    hasScene: !!scene,
    storyId,
    currentStoryId,
    forceNewSession,
    cacheSize: sceneCache.size
  });

  // Phase 1: ONLY clear cache when explicitly requested (forceNewSession)
  if (forceNewSession) {
    const newStoryId = storyId || crypto.randomUUID();
    console.log(`🆕 Starting fresh story session: ${newStoryId}`);
    currentStoryId = newStoryId;
    sceneCache.clear();
  } else if (sceneCount > 1 && !currentStoryId && storyId) {
    // Phase 3: Resume existing session
    console.log(`📖 Resuming story session: ${storyId}`);
    currentStoryId = storyId;
  }
  
  // Phase 1: CRITICAL - Validate story continuity
  if (sceneCount > 1 && storyId && currentStoryId && storyId !== currentStoryId) {
    console.error(`❌ CRITICAL: Story ID mismatch! Expected: ${currentStoryId}, Got: ${storyId}`);
    throw new Error('Story session corrupted - please start a new adventure');
  }
  
  // Update tracking if story ID provided for first scene
  if (storyId && !currentStoryId) {
    console.log(`📝 Setting current story ID: ${storyId}`);
    currentStoryId = storyId;
  }
  
  // Create cache key that includes story session ID
  const sessionId = storyId || currentStoryId || 'unknown';
  const cacheKey = JSON.stringify({ sessionId, profile, scene, megastory, maxTokens, sceneCount });
  const cached = sceneCache.get(cacheKey);
  
  // Check cache (5 minute TTL) - skip for first scene
  if (cached && Date.now() - cached.timestamp < 300000 && sceneCount > 1) {
    console.log("Using cached scene generation");
    return { ...cached.data, raw: null };
  }

  // Smart token calculation based on story type
  const optimizedTokens = maxTokens || (sceneCount === 1 ? 1800 : sceneCount >= 12 ? 1200 : 900);
  
  // Adjust max tokens based on story length
  const lengthMultiplier = profile.storyLength === 'short' ? 0.7 : profile.storyLength === 'epic' ? 1.5 : 1;
  const adjustedTokens = Math.floor(optimizedTokens * lengthMultiplier);
  
  try {
    const { data, error } = await supabase.functions.invoke("generate-story", {
      body: { profile, scene, megastory, max_tokens: adjustedTokens, scene_count: sceneCount, abilities: availableAbilities },
    });

    if (error) throw error;
    
    if (!data?.success && !data?.ok) {
      throw new Error(data?.error || "Failed to generate scene");
    }

    const text: string = data?.resultText ?? data?.text ?? "";
    const parsed: Scene | null = data?.result ?? data?.parsed ?? null;
    const result = { text, parsed, raw: data };
    
    // Cache the result with story session ID
    sceneCache.set(cacheKey, { 
      data: { parsed, text }, 
      timestamp: Date.now(),
      storyId: storyId || currentStoryId || 'unknown'
    });
    
    // Clean old cache entries (keep only last 10)
    if (sceneCache.size > 10) {
      const oldestKey = Array.from(sceneCache.keys())[0];
      sceneCache.delete(oldestKey);
    }

    return result;
  } catch (error: any) {
    console.error("Error in generateNextScene:", error);
    
    // Handle authentication errors specifically
    if (error.message?.includes("authentication") || error.message?.includes("Not authenticated")) {
      throw new Error("Authentication required. Please refresh the page and try again.");
    }
    
    // Handle Edge Function errors
    if (error.message?.includes("Edge Function")) {
      throw new Error("Story generation service is temporarily unavailable. Please try again in a moment.");
    }
    
    throw error;
  }
};
