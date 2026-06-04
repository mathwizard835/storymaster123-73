## Goal

Apply the existing retention modal to the iOS (Apple IAP) cancellation flow as well, so both platforms share the exact same "Before you go..." retention experience before any cancellation action is taken.

## Changes

**File: `src/pages/Subscription.tsx**`

1. Simplify `handleCancelSubscription` to just open the retention modal regardless of platform — remove the iOS `confirm()` and immediate App Store redirect.
2. Add a new `confirmCancelSubscriptionIOS()` function that:
  - Calls `setRetentionOpen(false)` **first**, before any async work, so the modal is dismissed before Capacitor `Browser.open` suspends the app (avoids frozen-backdrop artifact when the user returns).
  - Opens the existing exact URL `https://apps.apple.com/account/subscriptions` via `@capacitor/browser` with `presentationStyle: "popover"` (unchanged from current implementation — preserves native deep-link into Apple subscription settings).
  - Shows the existing "Manage in App Store" toast on success, and the existing fallback toast on error.
3. Add a small synchronous `handleContinueToCancel()` dispatcher wired to the modal's "Continue to Cancel" button:
  - Reads `isIOSPlatform()` directly at click time (no intermediate state) — this avoids any stale-state race because the branch decision is made synchronously from the platform helper, not from React state that could be reset early.
  - Calls `confirmCancelSubscriptionIOS()` on iOS, otherwise `confirmCancelSubscription()` (existing Stripe path, unchanged).
4. Wire the modal's "Continue to Cancel" button `onClick` to `handleContinueToCancel`.

No new state variables are introduced — platform detection happens at the moment of click, so there is no `cancelPlatform` value that could be reset prematurely.

## Details to Review

### 1. Verification of `isIOSPlatform()`

Ensure that the helper function `isIOSPlatform()` (or whatever the exact name is in your project, like `isIOS` from a utilities file or Capacitor's `Capacitor.getPlatform() === 'ios'`) is imported and readily available inside `src/pages/Subscription.tsx`. If it isn't already imported there, Lovable will just need to add the import statement at the top of the file.

## Out of scope

- No changes to modal copy, layout, or the "Keep My Plan" button.
- No changes to `cancelSubscription()` in `src/lib/subscription.ts` or any edge function.
- No changes to RevenueCat or Apple IAP entitlement handling.
- Web/Stripe flow behavior unchanged.