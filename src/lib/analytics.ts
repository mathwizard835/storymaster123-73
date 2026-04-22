// Privacy-safe, aggregate-only analytics client.
//
// HARD RULES:
//   - Never pass user_id, device_id, email, name, age, or raw prompt text.
//   - Pass only bucketed/anonymous values defined in the edge function's allowlist.
//   - The session_token is a short-lived random string that rotates every 30 min.
//     It is NOT a user identifier.
//   - All sends are fire-and-forget; failures must never break user flow.

import { supabase } from "@/integrations/supabase/client";

type Category = "system" | "performance" | "subscription" | "content" | "cache";

const SESSION_KEY = "smq.analytics_session";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

type SessionState = { token: string; expiresAt: number };

function newToken(): string {
  // ~22 chars URL-safe; clearly not a user/device id.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function getSessionToken(): string {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionState;
      if (parsed?.token && parsed.expiresAt > Date.now()) {
        return parsed.token;
      }
    }
  } catch {
    /* ignore */
  }
  const token = newToken();
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token, expiresAt: Date.now() + SESSION_TTL_MS }),
    );
  } catch {
    /* ignore */
  }
  return token;
}

// Force-rotate the session token (e.g. on sign-out).
export function rotateAnalyticsSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// Convert a raw age into one of the public buckets so callers can't leak it.
export function ageToBucket(age: number | undefined | null): "5-7" | "8-10" | "11-13" | null {
  if (typeof age !== "number" || !Number.isFinite(age)) return null;
  if (age >= 5 && age <= 7) return "5-7";
  if (age >= 8 && age <= 10) return "8-10";
  if (age >= 11 && age <= 13) return "11-13";
  return null;
}

// Convert profile.storyLength into the canonical length bucket.
export function lengthToBucket(len: string | undefined | null): "short" | "medium" | "epic" | null {
  if (len === "short" || len === "medium" || len === "epic") return len;
  return null;
}

// Simple in-memory queue with batching to reduce request count.
type QueuedEvent = {
  category: Category;
  name: string;
  meta: Record<string, unknown>;
};

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush(): Promise<void> {
  flushTimer = null;
  if (queue.length === 0) return;
  const session_token = getSessionToken();
  const batch = queue.splice(0, 25).map((e) => ({ ...e, session_token }));
  try {
    await supabase.functions.invoke("track-event", { body: { events: batch } });
  } catch (err) {
    // Swallow — analytics must never break the app.
    console.debug("analytics flush failed", err);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 1500);
}

/**
 * Fire-and-forget aggregate event.
 *
 * IMPORTANT: only pass non-identifying, bucketed values.
 * Anything outside the edge function's allowlist is silently dropped.
 */
export function trackEvent(
  category: Category,
  name: string,
  meta: Record<string, unknown> = {},
): void {
  try {
    queue.push({ category, name, meta });
    if (queue.length >= 10) {
      void flush();
    } else {
      scheduleFlush();
    }
  } catch {
    /* never throw from analytics */
  }
}

// Convenience helpers used by the app.

export function trackStoryStarted(args: {
  age?: number | null;
  length?: string | null;
  theme?: string | null;
}) {
  trackEvent("content", "story_started", {
    age_bucket: ageToBucket(args.age ?? null),
    length_bucket: lengthToBucket(args.length ?? null),
    theme_category: typeof args.theme === "string" ? args.theme.toLowerCase() : null,
  });
}

export function trackSceneGenerated(args: {
  sceneIndex: number;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
  fromCache?: boolean;
  promptHash?: string;
}) {
  trackEvent("system", "story_generated", {
    scene_index_bucket: args.sceneIndex,
    is_first_scene: args.sceneIndex === 0,
  });
  trackEvent("performance", "story_latency", {
    latency_ms: args.latencyMs,
    tokens_in: args.tokensIn,
    tokens_out: args.tokensOut,
    model: args.model,
  });
  trackEvent("cache", args.fromCache ? "cache_hit" : "cache_miss", {
    hit: !!args.fromCache,
    prompt_hash: args.promptHash,
  });
}

export function trackSubscriptionEvent(args: {
  plan: string;
  event: "started" | "renewed" | "churned" | "trial";
}) {
  trackEvent("subscription", `subscription_${args.event}`, {
    plan: args.plan,
    event: args.event,
  });
}
