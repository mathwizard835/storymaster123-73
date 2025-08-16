import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  age: number;
  reading: string; // apprentice | adventurer | hero
  selectedBadges: string[];
  mode: string; // thrill | fun | mystery | explore
  topic?: string;
};

export type SceneChoice = { id: string; label: string; impact: string };

export type Scene = {
  sceneTitle: string;
  hud: { energy: number; time: string; choicePoints: number; ui: string[] };
  narrative: string;
  choices: SceneChoice[];
  end: boolean;
};

const PROFILE_KEY = "smq.profile";
const DEVICE_ID_KEY = "smq.device_id";

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

// Check if the player has reached the story completion limit
export const checkStoryLimit = async (): Promise<{ canPlay: boolean; completedCount: number }> => {
  try {
    const deviceId = getDeviceId();
    const { data, error } = await supabase
      .from('story_completions')
      .select('id')
      .eq('device_id', deviceId);

    if (error) throw error;

    const completedCount = data?.length || 0;
    return { canPlay: completedCount < 1, completedCount };
  } catch (e) {
    console.error("Failed to check story limit", e);
    return { canPlay: true, completedCount: 0 }; // Allow play on error to avoid blocking
  }
};

// Mark a story as completed
export const markStoryCompleted = async (profile: Profile): Promise<void> => {
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
  } catch (e) {
    console.error("Failed to mark story as completed", e);
  }
};

export const generateNextScene = async (
  profile: Profile,
  scene?: unknown,
  megastory: boolean = false,
  maxTokens: number = 900,
  sceneCount: number = 1
): Promise<{ text: string; parsed: Scene | null; raw: any }> => {
  const { data, error } = await supabase.functions.invoke("generate-story", {
    body: { profile, scene, megastory, max_tokens: maxTokens, scene_count: sceneCount },
  });

  if (error) throw error;

  const text: string = data?.resultText ?? "";
  const parsed: Scene | null = data?.result ?? null;
  return { text, parsed, raw: data };
};
