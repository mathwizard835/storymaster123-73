## Diagnosis (account `30dmantri@ransomeverglades.org`, user id `68d8…d57`)

The DB shows a valid `active` row created today (`expires_at 2026‑06‑11 22:37`) attached to this user, written by a RevenueCat `RENEWAL` webhook. So entitlement data exists — the bug is in how the app reads and refreshes it after a reinstall/update. Three real defects line up with what the user saw:

### 1. RevenueCat is NOT re-identified on app reopen
`src/hooks/useAuth.tsx` only calls `identifyUser(session.user.id)` inside the `if (event === 'SIGNED_IN')` branch of `onAuthStateChange`. When the app launches with an existing Supabase session, Supabase fires `INITIAL_SESSION`, not `SIGNED_IN`. After a reinstall the RevenueCat SDK has no cached `appUserID` either, so it stays as `$RCAnonymousID`.

Consequences:
- `Purchases.restorePurchases()` validates the Apple receipt against the anonymous RC user. If those transactions are already attached to the real Supabase user id from before, RC issues a `TRANSFER` event (we see `Unhandled event type: TRANSFER` in `revenuecat-webhook` logs) and the active entitlement is *moved away* from the anonymous id — `customerInfo.entitlements.active` comes back empty, so `restorePurchases()` returns `{ isSubscribed: false }` and the UI shows "No Passes Found".
- Even when restore succeeds, the next webhook fires with `app_user_id = $RCAnonymousID`, the UUID guard in `revenuecat-webhook/index.ts` skips setting `user_id`, and the DB row is never linked to the Supabase user.

### 2. `revenuecat-webhook` ignores `TRANSFER`
The `switch (event.type)` has no case for `TRANSFER`. When RC moves the entitlement between app_user_ids (exactly what happens on reinstall), our DB is never updated, so `getUserSubscription` can return a stale/expired row and the user is paywalled.

### 3. `getUserSubscription` is device-first and depends on a fresh `auth.getUser()`
`src/lib/subscription.ts` queries by `device_id` first. After a reinstall Capacitor Preferences is wiped, so `getDeviceId()` returns a brand-new id and the device query returns nothing. The fallback to `user_id` calls `supabase.auth.getUser()` (a network call) again from inside the lib — on a cold start this can race or fail, and the function then returns `{ plan: null }`, triggering `RequireSubscription` to paywall. `RequireSubscription` retries once after 800 ms, but that's not enough when the underlying call fails outright.

### TestFlight amplifier
Apple's sandbox renews "monthly" subs every ~5 min and only sends `RENEWAL` webhooks on each cycle. The DB row's `expires_at` is set to the receipt expiration (24 h in production, but the sandbox value is much shorter). It's easy to hit a window where the most recent DB row has already expired and the next renewal webhook hasn't landed yet — combined with bugs 1–3, the app paywalls and "Restore" can't recover because of the TRANSFER/anonymous-id problem above.

---

## Plan

### A. Always identify RevenueCat with the current Supabase user
In `src/hooks/useAuth.tsx`:
- Call `identifyUser(session.user.id)` for both `SIGNED_IN` **and** `INITIAL_SESSION` events (and inside the `getSession()` bootstrap when a session is present).
- Also call it again right before `restorePurchases()` and `purchasePackage()` in `src/pages/Subscription.tsx` as a defensive guarantee.

### B. Handle `TRANSFER` (and treat it like a refresh) in the webhook
In `supabase/functions/revenuecat-webhook/index.ts`:
- Add a `case "TRANSFER":` that, when `event.transferred_to` contains a UUID app_user_id, cancels old `active` rows for that user and inserts a fresh active row using `event.expiration_at_ms` (mirroring the `RENEWAL` path).
- Tighten the `INITIAL_PURCHASE`/`RENEWAL`/`PRODUCT_CHANGE` block to also clear stale active rows that share the same `device_id` so reinstall doesn't leave duplicates.

### C. Make subscription lookup auth-aware and resilient
In `src/lib/subscription.ts` `getUserSubscription`:
- Accept an optional `userId` argument; when omitted, try `supabase.auth.getSession()` (local, synchronous-ish) before falling back to `getUser()`.
- Query by `user_id` first when a user id is available, then by `device_id`. This matches the post-reinstall reality where `device_id` is new but `user_id` is stable.
- Return any "currently entitled" row from either query (existing `isCurrentlyEntitled` logic stays).

In `src/App.tsx` `RequireSubscription`:
- Pass `user.id` into the new `getUserSubscription(user.id)` so the check doesn't depend on a second network round-trip to resolve the user.
- Bump the retry to 2 attempts at 600 ms / 1500 ms to better cover the cold-start window.

### D. Make Restore self-heal the DB
In `src/pages/Subscription.tsx` restore handler and `src/lib/iapService.ts` `restorePurchases`:
- Before calling `Purchases.restorePurchases()`, ensure `initializeRevenueCat()` has completed and `identifyUser(currentUserId)` has run.
- After a successful restore, call `activateSubscriptionAfterPurchase('premium')` (already wired) — this will now write a row tied to the correct `user_id` because identify happened first.
- If restore reports no entitlement but `customerInfo.allPurchasedProductIdentifiers` includes `sm_699_1m`, surface a clearer message ("Apple shows a past purchase but no active subscription — open Settings → Apple ID → Subscriptions to confirm it's still active") instead of the generic "No Passes Found".

### E. Memory + docs
- Update `mem://billing/revenuecat-iap` to note: identify on `INITIAL_SESSION`, handle `TRANSFER`, user_id-first lookup.
- No new secrets, no schema migration.

---

## Technical notes
- `INITIAL_SESSION` is the standard supabase-js v2 event for "session restored from storage at app start"; it must be treated identically to `SIGNED_IN` for any client-side identity wiring (RC, analytics, etc.).
- The `TRANSFER` event payload (`event.transferred_to: string[]`, `event.transferred_from: string[]`) is documented by RevenueCat; we treat the last UUID in `transferred_to` as the new owner.
- `getUserSubscription` is called from many places (RequireSubscription, StoryLimitWidget, Subscription page, analytics). Making the `userId` param optional keeps existing callers working.
- No change to the `40/30d` removal already in flight; subscriber path stays unlimited.
