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
      let reason = `You've used ${storiesUsedThisMonth}/${monthlyLimit} stories in the last 30 days.`;
      if (bonusStories > 0) {
        reason += ` (${bonusStories} bonus stories included)`;
      }
      reason += " Upgrade to Adventure Pass for 40 stories every 30 days, or wait for your oldest story to roll off.";

      return { canPlay: false, completedCount: storiesUsedThisMonth, reason };
    }


    return { canPlay: true, completedCount: storiesUsedThisMonth };
  } catch (e) {
    console.error("Failed to check story limit", e);
    // Fail-closed on native (hard paywall), fail-open on web.
    try {
      const { isNativePlatform } = await import("@/lib/platform");
      if (isNativePlatform()) {
        return { canPlay: false, completedCount: 0, reason: "Couldn't verify your subscription. Please check your connection and try again." };
      }
    } catch {}
    return { canPlay: true, completedCount: 0 };
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('story_completions')
        .insert([
          {
            user_id: user.id,
            device_id: deviceId,
            profile: profile,
          },
        ]);

      if (error) throw error;
    }

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

// In-flight de-dupe: if an identical request is already running, await it
// instead of firing a parallel Anthropic call. Entries are always removed in
// a finally block so a rejected promise can never permanently lock a key.
const inFlightScenes = new Map<string, Promise<{ text: string; parsed: Scene | null; raw: any; deviceFingerprint?: string }>>();

// Track current story session to prevent cross-story cache contamination
let currentStoryId: string | null = null;

export const clearSceneCache = () => {
  sceneCache.clear();
  inFlightScenes.clear();
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
  maxTokens: number = 1600,
  sceneCount: number = 1,
  storyId?: string,
  forceNewSession: boolean = false,
  availableAbilities: string[] = [],
  onNarrativeDelta?: (partialNarrative: string) => void,
  opts?: { guest?: boolean; devBypass?: string }
): Promise<{ text: string; parsed: Scene | null; raw: any; deviceFingerprint?: string }> => {
  const isGuest = opts?.guest === true;
  const devBypass = opts?.devBypass;
  // Phase 4: Defensive logging
  console.log(`🎬 generateNextScene called:`, {
    sceneCount,
    hasScene: !!scene,
    storyId,
    currentStoryId,
    forceNewSession,
    cacheSize: sceneCache.size,
    streaming: !!onNarrativeDelta,
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
    // Replay the cached narrative through the streaming callback so the UI
    // stays consistent whether we hit the cache or the network.
    if (onNarrativeDelta && cached.data.parsed?.narrative) {
      try { onNarrativeDelta(cached.data.parsed.narrative); } catch { /* ignore */ }
    }
    return { ...cached.data, raw: null };
  }

  // Smart token calculation. Continuation scenes use a tighter floor now that
  // the edge function has its own retry-on-truncation safety net — no need to
  // pre-pay for output tokens we usually don't emit. First scenes still need
  // headroom because they include the full setup envelope.
  const optimizedTokens = Math.max(maxTokens, sceneCount === 1 ? 2000 : 1300);

  const { isNativePlatform } = await import("@/lib/platform");
  const platform = isNativePlatform() ? "native" : "web";

  // In-flight de-dupe: if the same scene is already being generated, return
  // the existing promise instead of firing a parallel request.
  const existing = inFlightScenes.get(cacheKey);
  if (existing) {
    console.log("⏳ Awaiting in-flight scene generation for identical request");
    return existing;
  }

  // ---- Non-streaming invocation (used by default, and as fallback) ----
  const invokeNonStreaming = async () => {
    const { data, error } = await supabase.functions.invoke("generate-story", {
      body: {
        profile,
        scene,
        megastory,
        max_tokens: optimizedTokens,
        scene_count: sceneCount,
        abilities: availableAbilities,
        platform,
        _retry: false,
        ...(isGuest ? { guest: true } : {}),
      },
    });

    if (error) throw error;

    if (!data?.success && !data?.ok) {
      const errorMsg = data?.error || "Failed to generate scene";
      const details = data?.details || data?.preview || "";
      console.error("Edge function error:", errorMsg, details);
      throw new Error(errorMsg);
    }

    const text: string = data?.resultText ?? data?.text ?? "";
    const parsed: Scene | null = data?.result ?? data?.parsed ?? null;
    const deviceFingerprintResult: string | undefined = data?.deviceFingerprint ?? undefined;

    if (text && !parsed) {
      console.error("Failed to parse story response. Text length:", text.length);
      console.error("Text preview:", text.slice(0, 200));
    }

    return { text, parsed, raw: data, deviceFingerprint: deviceFingerprintResult };
  };

  // ---- Streaming invocation (only when caller provided onNarrativeDelta) ----
  // Returns the SAME result shape as invokeNonStreaming. On ANY failure
  // (network drop, malformed SSE, abort, missing session), falls back to
  // the non-streaming path so the caller is never worse off than before.
  const invokeStreaming = async (): Promise<{ text: string; parsed: Scene | null; raw: any; deviceFingerprint?: string }> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const rawBase = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
      const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
      if (!rawBase || !anonKey) {
        console.warn("[stream] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY, falling back");
        return invokeNonStreaming();
      }

      // Streaming requires an authenticated session UNLESS in guest mode (anon key auth).
      if (!accessToken && !isGuest) {
        console.warn("[stream] No access token, falling back to non-streaming");
        return invokeNonStreaming();
      }

      // Defensive: strip trailing slashes to prevent `//functions/...` paths
      // that some CDNs reject with a CORS / 404 before the stream handshake.
      const base = rawBase.replace(/\/+$/, "");
      const endpoint = `${base}/functions/v1/generate-story`;

      // For guests, the anon key serves as the bearer token (no session JWT exists).
      const bearer = accessToken || anonKey;

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bearer}`,
          "apikey": anonKey,
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          profile,
          scene,
          megastory,
          max_tokens: optimizedTokens,
          scene_count: sceneCount,
          abilities: availableAbilities,
          platform,
          _retry: false,
          stream: true,
          ...(isGuest ? { guest: true } : {}),
        }),
      });

      if (!resp.ok || !resp.body) {
        console.warn(`[stream] HTTP ${resp.status}, falling back`);
        return invokeNonStreaming();
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";
      let lastNarrativeEmit = "";
      let finalScene: { text: string; parsed: Scene | null; raw: any; deviceFingerprint?: string } | null = null;
      let streamError: string | null = null;

      // Regex that captures the in-progress narrative substring even when the
      // closing `"` hasn't arrived yet. The `(?:\\.|[^"\\])*` body is safe
      // against chunk-boundary splits: a dangling `\` simply terminates the
      // match early and gets included on the next chunk after the escape
      // sequence completes.
      const narrativeRegex = /"narrative"\s*:\s*"((?:\\.|[^"\\])*)/;

      const unescapeJsonString = (raw: string): string => {
        // Hand-unescape so we don't fail on incomplete sequences. Anything
        // unrecognized is left as-is.
        let out = "";
        for (let i = 0; i < raw.length; i++) {
          const ch = raw[i];
          if (ch === "\\" && i + 1 < raw.length) {
            const n = raw[i + 1];
            if (n === "n") { out += "\n"; i++; }
            else if (n === "t") { out += "\t"; i++; }
            else if (n === "r") { out += "\r"; i++; }
            else if (n === '"') { out += '"'; i++; }
            else if (n === "\\") { out += "\\"; i++; }
            else if (n === "/") { out += "/"; i++; }
            else if (n === "u" && i + 5 < raw.length) {
              const hex = raw.slice(i + 2, i + 6);
              if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                out += String.fromCharCode(parseInt(hex, 16));
                i += 5;
              } else {
                out += ch;
              }
            } else {
              // Incomplete escape at end of buffer — leave for next chunk
              if (i + 1 === raw.length - 0) break;
              out += ch;
            }
          } else {
            out += ch;
          }
        }
        return out;
      };

      const flushEvents = () => {
        let sep: number;
        while ((sep = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          const lines = block.split("\n");
          let evtName = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event:")) evtName = line.slice(6).trim();
            else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;
          let payload: any;
          try { payload = JSON.parse(dataStr); } catch { continue; }

          if (evtName === "delta" && typeof payload?.text === "string") {
            accumulated += payload.text;
            if (onNarrativeDelta) {
              const m = accumulated.match(narrativeRegex);
              if (m && m[1] !== undefined) {
                const partial = unescapeJsonString(m[1]);
                if (partial !== lastNarrativeEmit) {
                  lastNarrativeEmit = partial;
                  try { onNarrativeDelta(partial); } catch { /* ignore */ }
                }
              }
            }
          } else if (evtName === "scene") {
            finalScene = {
              text: payload?.resultText ?? payload?.text ?? accumulated,
              parsed: (payload?.result ?? payload?.parsed ?? null) as Scene | null,
              raw: payload,
              deviceFingerprint: payload?.deviceFingerprint,
            };
          } else if (evtName === "error") {
            streamError = payload?.error || "Stream error";
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        flushEvents();
        if (finalScene || streamError) break;
      }
      // Drain any trailing buffered events
      buf += decoder.decode();
      flushEvents();

      if (finalScene && finalScene.parsed) {
        return finalScene;
      }
      console.warn(`[stream] No valid scene frame (${streamError ?? "no error"}), falling back`);
      return invokeNonStreaming();
    } catch (streamErr) {
      console.warn("[stream] threw, falling back:", streamErr);
      return invokeNonStreaming();
    }
  };

  const run = (async () => {
    try {
      const result = onNarrativeDelta ? await invokeStreaming() : await invokeNonStreaming();

      // Only cache SUCCESSFUL parses so a one-off failure can't lock the user
      // out of retrying with the same inputs.
      if (result.parsed) {
        sceneCache.set(cacheKey, {
          data: { parsed: result.parsed, text: result.text },
          timestamp: Date.now(),
          storyId: storyId || currentStoryId || 'unknown'
        });

        if (sceneCache.size > 10) {
          const oldestKey = Array.from(sceneCache.keys())[0];
          sceneCache.delete(oldestKey);
        }
      }

      return result;
    } catch (error: any) {
      console.error("Error in generateNextScene:", error);

      if (error.message?.includes("authentication") || error.message?.includes("Not authenticated")) {
        throw new Error("Authentication required. Please refresh the page and try again.");
      }

      if (error.message?.includes("Edge Function")) {
        throw new Error("Story generation service is temporarily unavailable. Please try again in a moment.");
      }

      throw error;
    }
  })();

  inFlightScenes.set(cacheKey, run);
  // ALWAYS clear the in-flight entry, whether the promise resolved or rejected,
  // so a failed request can never permanently lock that cache key.
  run.finally(() => {
    if (inFlightScenes.get(cacheKey) === run) {
      inFlightScenes.delete(cacheKey);
    }
  });

  return run;
};





