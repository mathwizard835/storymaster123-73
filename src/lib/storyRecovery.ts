// Crash recovery for in-progress stories.
// iOS can kill the web view instantly (out of memory) without running any
// cleanup, so we keep a synchronous localStorage checkpoint of the story and
// a small "circuit breaker" that stops auto-resume if one story keeps crashing.
import type { SavedStory } from "@/lib/story";

const KEY = "sm_story_checkpoint_v1";
export const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CRASH_WINDOW_MS = 60 * 1000;
export const CRASH_LIMIT = 2;

export interface StoryCheckpoint {
  userId: string | null;
  storyId: string;
  sceneIndex: number;
  story: SavedStory;
  pendingChoiceId?: string | null;
  updatedAt: number;
  bootAttempts: number;
  firstBootAt: number | null;
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const store = (): Store | null => {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
};

export const loadCheckpoint = (userId: string | null, s: Store | null = store()): StoryCheckpoint | null => {
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const cp = JSON.parse(raw) as StoryCheckpoint;
    if (!cp?.storyId || !cp.story) return null;
    if ((cp.userId ?? null) !== (userId ?? null)) return null;
    return cp;
  } catch { return null; }
};

const write = (cp: StoryCheckpoint, s: Store | null) => {
  if (!s) return;
  try { s.setItem(KEY, JSON.stringify(cp)); } catch { /* quota: ignore */ }
};

export const saveCheckpoint = (userId: string | null, story: SavedStory, now = Date.now(), s: Store | null = store()) => {
  if (!story?.id || story.completed || !story.scenes?.length) return;
  const prev = loadCheckpoint(userId, s);
  const same = prev?.storyId === story.id;
  write({
    userId: userId ?? null,
    storyId: story.id,
    sceneIndex: story.currentSceneIndex ?? story.scenes.length - 1,
    story,
    pendingChoiceId: null,
    updatedAt: now,
    bootAttempts: same ? prev!.bootAttempts : 0,
    firstBootAt: same ? prev!.firstBootAt : null,
  }, s);
};

export const savePendingChoice = (userId: string | null, storyId: string, choiceId: string, s: Store | null = store()) => {
  const cp = loadCheckpoint(userId, s);
  if (!cp || cp.storyId !== storyId) return;
  write({ ...cp, pendingChoiceId: choiceId }, s);
};

export const clearCheckpoint = (s: Store | null = store()) => {
  try { s?.removeItem(KEY); } catch { /* ignore */ }
};

export const isCheckpointFresh = (cp: StoryCheckpoint | null, now = Date.now()) =>
  !!cp && now - cp.updatedAt < RESUME_WINDOW_MS;

/** Count a boot of this story. Returns true when the breaker trips. */
export const registerBoot = (userId: string | null, storyId: string, now = Date.now(), s: Store | null = store()): boolean => {
  const cp = loadCheckpoint(userId, s);
  if (!cp || cp.storyId !== storyId) return false;
  const inWindow = cp.firstBootAt !== null && now - cp.firstBootAt < CRASH_WINDOW_MS;
  const attempts = inWindow ? cp.bootAttempts + 1 : 1;
  const firstBootAt = inWindow ? cp.firstBootAt : now;
  write({ ...cp, bootAttempts: attempts, firstBootAt }, s);
  return attempts >= CRASH_LIMIT;
};

/** Call once the scene has stayed alive a few seconds or the child tapped a choice. */
export const markStable = (userId: string | null, storyId: string, s: Store | null = store()) => {
  const cp = loadCheckpoint(userId, s);
  if (!cp || cp.storyId !== storyId || cp.bootAttempts === 0) return;
  write({ ...cp, bootAttempts: 0, firstBootAt: null }, s);
};

/**
 * Pick the most complete copy of a story. If the local checkpoint is ahead of
 * the database (the app died before the save landed), use the local copy.
 */
export const mergeWithCheckpoint = (
  dbStory: SavedStory | null,
  cp: StoryCheckpoint | null,
): { story: SavedStory | null; localAhead: boolean } => {
  if (!dbStory) return { story: null, localAhead: false };
  if (!cp || cp.storyId !== dbStory.id || dbStory.completed) return { story: sanitize(dbStory), localAhead: false };
  const localScenes = cp.story.scenes?.length ?? 0;
  if (localScenes > (dbStory.scenes?.length ?? 0)) {
    return { story: sanitize({ ...dbStory, scenes: cp.story.scenes, currentSceneIndex: cp.sceneIndex }), localAhead: true };
  }
  return { story: sanitize(dbStory), localAhead: false };
};

/** Keep currentSceneIndex pointing at a real scene (falls back to the last valid one). */
export const sanitize = (story: SavedStory): SavedStory => {
  const scenes = (story.scenes || []).filter(Boolean);
  const last = Math.max(0, scenes.length - 1);
  const idx = story.currentSceneIndex ?? last;
  const safe = idx >= 0 && idx <= last && scenes[idx] ? idx : last;
  return { ...story, scenes, currentSceneIndex: safe };
};

export const isRecoverableStatus = (status: string | null | undefined) => status === "active" || status === "paused";

/** Throttle a setter; cancel() drops a pending trailing call. */
export const createThrottle = <T,>(fn: (v: T) => void, ms: number) => {
  let last = 0; let timer: ReturnType<typeof setTimeout> | null = null; let pending: T | undefined; let has = false;
  const run = (v: T) => {
    const now = Date.now();
    const wait = ms - (now - last);
    if (wait <= 0) { last = now; fn(v); return; }
    pending = v; has = true;
    if (!timer) timer = setTimeout(() => { timer = null; last = Date.now(); if (has) { has = false; fn(pending as T); } }, wait);
  };
  run.cancel = () => { if (timer) clearTimeout(timer); timer = null; has = false; };
  return run as ((v: T) => void) & { cancel: () => void };
};
