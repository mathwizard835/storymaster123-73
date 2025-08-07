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

export const generateNextScene = async (
  profile: Profile,
  scene?: unknown,
  megastory: boolean = false,
  maxTokens: number = 900
): Promise<{ text: string; parsed: Scene | null; raw: any }> => {
  const { data, error } = await supabase.functions.invoke("generate-story", {
    body: { profile, scene, megastory, max_tokens: maxTokens },
  });

  if (error) throw error;

  const text: string = data?.resultText ?? "";
  const parsed: Scene | null = data?.result ?? null;
  return { text, parsed, raw: data };
};
