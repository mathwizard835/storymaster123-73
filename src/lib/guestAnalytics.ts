// Lightweight, anonymous, fire-and-forget analytics for the guest funnel.
// No PII, no user_id — just an opaque session id stored in sessionStorage.

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "smq.guest_session";

export type GuestEvent =
  | "story_card_view"
  | "story_card_tap"
  | "scene_reached"
  | "cliffhanger_shown"
  | "cliffhanger_continue"
  | "cliffhanger_save"
  | "bonus_revealed"
  | "signup_after_cliffhanger";

const getSessionId = (): string => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-session";
  }
};

export const trackGuestEvent = (
  event: GuestEvent,
  meta?: { storySlug?: string; sceneIndex?: number }
): void => {
  // Fire-and-forget. Never block UI on this.
  try {
    const session_id = getSessionId();
    void supabase
      .from("guest_analytics")
      .insert({
        session_id,
        event,
        story_slug: meta?.storySlug ?? null,
        scene_index: meta?.sceneIndex ?? null,
      })
      .then(({ error }) => {
        if (error) {
          // Silent: analytics must never disrupt UX.
          console.debug("[guestAnalytics] insert failed", error.message);
        }
      });
  } catch (e) {
    console.debug("[guestAnalytics] error", e);
  }
};

// Marker so post-signup screen knows the user came from a cliffhanger.
const PENDING_KEY = "smq.pending_starter_story";
export const setPendingStarterStory = (slug: string) => {
  try {
    localStorage.setItem(PENDING_KEY, slug);
  } catch {}
};
export const getPendingStarterStory = (): string | null => {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
};
export const clearPendingStarterStory = () => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
};
