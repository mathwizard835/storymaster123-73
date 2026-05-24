import { isNativePlatform } from "@/lib/platform";

/**
 * Request an iOS native "rate this app" prompt at a high-engagement moment.
 *
 * Apple throttles SKStoreReviewController to at most ~3 prompts per 365 days
 * per user, so it's safe to call — the OS decides whether to actually show it.
 * We additionally guard with a per-trigger localStorage flag so we never ask
 * the same user twice for the same milestone.
 */
export async function requestAppReview(triggerKey: string): Promise<void> {
  try {
    if (!isNativePlatform()) return;

    const storageKey = `app_review_requested:${triggerKey}`;
    if (typeof window !== "undefined" && window.localStorage?.getItem(storageKey)) {
      return;
    }

    const mod = await import("@capacitor-community/in-app-review").catch(() => null);
    const InAppReview = (mod as any)?.InAppReview;
    if (!InAppReview?.requestReview) return;

    await InAppReview.requestReview();

    try {
      window.localStorage?.setItem(storageKey, new Date().toISOString());
    } catch {
      /* ignore */
    }
  } catch (err) {
    console.warn("[appReview] requestReview failed:", err);
  }
}
