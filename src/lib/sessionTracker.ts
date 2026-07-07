/**
 * Foreground session tracker.
 *
 * Measures REAL time (wall-clock, not word-count estimates) that a signed-in
 * user has the app in the foreground.
 *
 *   - A "session" starts when the user is authenticated AND the tab is visible
 *     (or the native app is in the foreground).
 *   - Every HEARTBEAT_MS while foregrounded we bump `active_seconds` and
 *     `last_heartbeat_at` on the row.
 *   - When the tab goes hidden / native app pauses / user signs out / page
 *     unloads, we finalize the row with `ended_at`.
 *   - When the user returns, a NEW row is started.
 *
 * Rows land in `public.app_sessions` and are the source of truth for
 * "how many real minutes/day is a user actually in the app".
 */

import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { isNativePlatform } from "@/lib/platform";

// Cast to any because `app_sessions` is not yet in the generated types.
const supabase = supabaseClient as any;

const HEARTBEAT_MS = 15_000; // 15s
// If the last heartbeat is older than this on resume, we don't retro-credit
// the gap — we finalize the previous session and open a new one.
const MAX_GAP_MS = 30_000;

type ActiveSession = {
  id: string;
  userId: string;
  startedAt: number; // ms epoch
  lastTickAt: number; // ms epoch — last time we credited active_seconds
  accumulatedSeconds: number;
};

let current: ActiveSession | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let listenersBound = false;
let currentUserId: string | null = null;

// Native App plugin listener handles (assigned dynamically to avoid pulling
// Capacitor into the web bundle unnecessarily).
let nativeAppStateHandle: { remove: () => void } | null = null;

const now = () => Date.now();
const isForeground = () =>
  typeof document === "undefined" ? true : document.visibilityState === "visible";

const currentRoute = () =>
  typeof window === "undefined" ? null : window.location.pathname;

const platformLabel = () => (isNativePlatform() ? "native" : "web");

// ---------- lifecycle ----------

async function startSession(userId: string) {
  if (current || !userId) return;
  try {
    const startedAt = new Date();
    const { data, error } = await supabase
      .from("app_sessions")
      .insert({
        user_id: userId,
        started_at: startedAt.toISOString(),
        last_heartbeat_at: startedAt.toISOString(),
        active_seconds: 0,
        platform: platformLabel(),
        route: currentRoute(),
      })
      .select("id")
      .single();

    if (error || !data) {
      console.warn("[sessionTracker] failed to start session", error);
      return;
    }

    current = {
      id: data.id,
      userId,
      startedAt: startedAt.getTime(),
      lastTickAt: startedAt.getTime(),
      accumulatedSeconds: 0,
    };
  } catch (e) {
    console.warn("[sessionTracker] startSession threw", e);
  }
}

async function tick(finalize = false) {
  if (!current) return;
  const nowMs = now();
  const delta = nowMs - current.lastTickAt;

  // Only credit if the gap looks like a real foreground interval.
  // (Guards against machine sleep / long background stalls.)
  if (delta > 0 && delta <= MAX_GAP_MS + HEARTBEAT_MS) {
    current.accumulatedSeconds += Math.round(delta / 1000);
  }
  current.lastTickAt = nowMs;

  const payload: Record<string, any> = {
    last_heartbeat_at: new Date(nowMs).toISOString(),
    active_seconds: current.accumulatedSeconds,
  };
  if (finalize) payload.ended_at = new Date(nowMs).toISOString();

  try {
    const { error } = await supabase
      .from("app_sessions")
      .update(payload)
      .eq("id", current.id);
    if (error) console.warn("[sessionTracker] tick update failed", error);
  } catch (e) {
    console.warn("[sessionTracker] tick threw", e);
  }
}

async function endSession() {
  if (!current) return;
  await tick(true);
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  current = null;
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    // Only credit while foregrounded.
    if (isForeground() && current) {
      void tick(false);
    }
  }, HEARTBEAT_MS);
}

// ---------- foreground / background transitions ----------

async function onForeground() {
  if (!currentUserId) return;
  if (!current) {
    await startSession(currentUserId);
    startHeartbeat();
  }
}

async function onBackground() {
  // Flush + finalize so we don't leave a hanging row across long backgrounds.
  await endSession();
}

// ---------- event wiring ----------

async function bindListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void onForeground();
    } else {
      void onBackground();
    }
  });

  // Best-effort finalize on unload. We use `pagehide` because it fires more
  // reliably than `beforeunload` on mobile browsers.
  window.addEventListener("pagehide", () => {
    // Fire-and-forget; the browser may not wait for the promise.
    void endSession();
  });

  // Native (Capacitor) app state — dynamically imported to keep this file
  // safe on the web where the plugin doesn't exist.
  if (isNativePlatform()) {
    try {
      const { App } = await import("@capacitor/app");
      nativeAppStateHandle = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void onForeground();
        else void onBackground();
      });
    } catch (e) {
      // Plugin not available — fall back to the DOM visibility listener above.
    }
  }
}

// ---------- public API ----------

/**
 * Begin tracking foreground time for this user. Safe to call repeatedly with
 * the same user id. Call `stopForegroundTracking()` on sign-out.
 */
export async function startForegroundTracking(userId: string) {
  if (!userId) return;
  if (currentUserId && currentUserId !== userId) {
    // User switched — finalize the previous user's session first.
    await endSession();
  }
  currentUserId = userId;
  await bindListeners();
  if (isForeground()) {
    await startSession(userId);
    startHeartbeat();
  }
}

/**
 * Stop tracking (on sign-out). Finalizes the open row.
 */
export async function stopForegroundTracking() {
  currentUserId = null;
  await endSession();
  if (nativeAppStateHandle) {
    try {
      nativeAppStateHandle.remove();
    } catch {
      // ignore
    }
    nativeAppStateHandle = null;
  }
}
