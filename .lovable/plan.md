# Fix iOS Subscription Cancellation

## The problem (iOS only)

On the native iOS app, tapping **Cancel Subscription** currently calls `cancelSubscription()` in `src/lib/subscription.ts`, which immediately flips the `user_subscriptions` row to `status='cancelled'`. This causes two iOS-specific issues:

1. **Apple policy violation risk.** Apple requires that subscriptions purchased through IAP be cancelled via the user's App Store account — the app cannot cancel them. Our DB flip does nothing to Apple, so Apple keeps billing the user even though our app shows them as cancelled.
2. **User loses access immediately**, contradicting the on-screen promise: *"Your Adventure Pass will remain active until the end of your billing period."* The Apple subscription is still paid through period end, but our app already locked them out.

Web/Stripe behavior is out of scope for this plan.

## The fix

Make the iOS cancel button do what Apple expects: send the user to **Manage Subscriptions** in the App Store, and let RevenueCat's `EXPIRATION` webhook flip the DB row to `expired` when the Apple period actually ends.

### Changes

**1. `src/pages/Subscription.tsx` — `handleCancelSubscription**`

Branch on platform:

- **iOS (native):** Do NOT call `cancelSubscription()`. Show a confirm explaining cancellation happens in App Store settings, then open Apple's manage-subscriptions URL via `@capacitor/browser`:
  - URL: `https://apps.apple.com/account/subscriptions`
  - After opening, show a toast: *"Manage your subscription in the App Store. Your Adventure Pass stays active until the end of your billing period."*
  - Do not touch the DB. Do not clear the premium theme. RevenueCat webhook will mark the row `expired` at period end.
- **Web:** Keep existing behavior unchanged (still calls `cancelSubscription()`).

**2. `supabase/functions/revenuecat-webhook/index.ts` — verify**

Confirm the `EXPIRATION` event sets `status='expired'` for the matching `user_subscriptions` row (per memory `billing/revenuecat-iap` and prior analysis this is already in place). No code change expected; just verify. If the lookup uses `device_id` only, add a `user_id` fallback so cross-device users are correctly expired.

**3. Copy tweak (iOS only)**

The reassurance text under the cancel button ("…remain active until the end of your billing period") stays accurate on iOS once the above is in place.

## What this does NOT change

- Web/Stripe cancel flow — untouched.
- Story limits, paywall gate, achievements fix, manual grants — untouched.
- Pricing, plans, RevenueCat purchase flow — untouched.

## Verification

- Build passes.
- On a native iOS build: tapping Cancel opens `apps.apple.com/account/subscriptions` in Safari; DB row stays `active`; toast shows the period-end message.
- On web: cancel behaves exactly as today.

## Technical notes

- Platform detection: use existing `isNativePlatform()` / `isIOSPlatform()` from `src/lib/nativePayments.ts`.
- Browser open: use `Browser.open({ url, presentationStyle: 'popover' })` from `@capacitor/browser` (already a dependency, used elsewhere in `nativePayments.ts`).
- No migrations, no new secrets, no new edge functions.    