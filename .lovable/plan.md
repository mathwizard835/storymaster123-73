# Major Bugs & UX Issues Audit

Scoped to issues that would significantly hurt the user (lock them out, charge them incorrectly, or lose their progress). Each item lists where it lives and the user impact — no fixes yet.

## 1. Stripe cancel doesn't actually cancel in Stripe (web)
- **Where:** `src/pages/Subscription.tsx` `handleCancelSubscription` (web branch) → `src/lib/subscription.ts` `cancelSubscription`
- **What happens:** Flips `user_subscriptions.status` to `cancelled` immediately. Never calls Stripe.
- **Impact:** User loses access right away (despite toast promising "until end of billing period"), AND Stripe keeps billing them next cycle. Double-bad: angry refund requests + chargebacks.

## 2. No "access until period end" honored anywhere
- **Where:** `src/lib/subscription.ts` `getUserSubscription` filters strictly on `status='active'`.
- **What happens:** The moment a row is anything other than `active` (cancel, webhook update, manual flip), the user is downgraded. There is no `expires_at` or `cancel_at_period_end` check.
- **Impact:** Paying users who cancel mid-month are paywalled immediately; iOS users whose Apple sub is "cancelled but still in period" can be locked out if the RevenueCat webhook sends an early CANCELLATION event.

## 3. Manual subscription grants never expire
- **Where:** `user_subscriptions.expires_at` exists but is checked nowhere in `getUserSubscription` or `RequireSubscription`.
- **Impact:** Comp accounts (influencers, testers like `davenmantri@gmail.com`) stay premium forever even after `expires_at`. Also, any logic relying on expiry is silently broken.

## 4. Native paywall gate fails-closed on any error → false paywall
- **Where:** `src/App.tsx` `RequireSubscription`
- **What happens:** `catch` sets `hasSub=false` → instant redirect to `/subscription?required=true`. Any transient Supabase hiccup, offline blink, or slow cold-start throws a real subscriber to the paywall.
- **Impact:** Paying iOS users repeatedly bounced to paywall after network blips, app resume, or token refresh failures. Worst-case they tap "Subscribe" again and get a duplicate purchase prompt.

## 5. `RequireSubscription` re-checks only on `user.id` change
- **Where:** Same hook (`useEffect` deps: `[user?.id]`).
- **What happens:** After a successful purchase, the in-memory `hasSub` doesn't update unless the user navigates away and back, or refreshes. Combined with #4, a freshly-subscribed user may bounce back to the paywall once before it sticks.
- **Impact:** Confusion and support tickets immediately after purchase ("I paid but it's still asking me to subscribe").

## 6. Achievements panel only reads localStorage; sync may overwrite mid-render
- **Where:** `src/pages/Achievements.tsx` (`loadAchievements()` from local storage) + `src/lib/syncProgress.ts` runs on focus/visibility.
- **What happens:** When the child taps the Trophies tab after finishing a story, `updateProgress()` has added the new badge locally. Then `useProgressSync` fires (focus event) → `syncProgressFromDatabase` rebuilds achievements from `user_stories` rows. If the new completion row hasn't been written/synced yet, the merge keeps old totals (it uses `Math.max`) but may temporarily render a flash before the merge completes.
- **Impact:** The exact symptom the user reported earlier — "new achievement appears for a second, then disappears." Likely partially-fixed by the recent merge change, but there's still a race: if `gainExperience()` runs in sync AFTER `saveCharacter(character)` resets character to defaults at line 70-71, in-flight XP updates that haven't been persisted to a story row will be lost. Char totals only come from re-played history.

## 7. Character XP is rebuilt from scratch on every sync
- **Where:** `src/lib/syncProgress.ts` lines 70-71 → `let character = { ...DEFAULT_CHARACTER }; saveCharacter(character);`
- **What happens:** Sync wipes the saved character to defaults, then replays history (12 XP × scene_count for in-progress + per-story for completed). Any XP earned from sources NOT captured in `user_stories` (ability use, bonuses, future features) is permanently lost on next sync. Also, if `user_stories` rows fail to load, the user is briefly shown level 1.
- **Impact:** Visible level/XP regressions; potential level-down flash whenever the Achievements/Dashboard refreshes.

## 8. `getStoriesRemaining` returns `canPlay: true` on error (web) BUT effectively blocks (native)
- **Where:** `src/lib/subscription.ts` `getStoriesRemaining` catch block returns `monthlyLimit: 3, canPlay: true`.
- **What happens:** On native, default `3 > 0`, so a transient Supabase failure could let a non-subscriber start a story. Inverse is also true elsewhere — fail-open vs fail-closed is inconsistent across `RequireSubscription` (fails closed) and limits (fails open).
- **Impact:** Inconsistent gating; also potential edge-function-side bypass if the client decides `canPlay`.

## 9. Stripe webhook flips to `cancelled` on any non-active status
- **Where:** `supabase/functions/stripe-webhook` (per earlier audit summary)
- **What happens:** `customer.subscription.updated` with status `past_due` or `unpaid` (transient billing retry) sets row to `cancelled`. Combined with #2, user instantly loses access during a card-retry that Stripe would have resolved automatically.
- **Impact:** False cancellations on temporary payment hiccups.

## 10. `PublicRoute` email-verification escape allows redirect loops
- **Where:** `src/App.tsx` `PublicRoute`
- **What happens:** Reads `window.location.hash` once. If verification hash is present but `useAuth` hasn't processed it yet, redirect can fire/not fire inconsistently across re-renders.
- **Impact:** Occasional "stuck on auth page" or double-redirect after email confirmation on native.

## 11. Subscription page shows stale `pack_success` / `stories` UI for a removed feature
- **Where:** `src/pages/Subscription.tsx` lines 35-37, 68-79.
- **What happens:** Story-pack code paths still exist and show "Story Pack Purchased!" toasts, despite the feature being explicitly forbidden per project memory.
- **Impact:** Dead code that could re-surface a forbidden upsell or break with a stray URL param.

## 12. Story limit messaging mismatch
- **Where:** `getStoriesRemaining` uses rolling 30 days; Subscription.tsx "limitReached" card says "unlock on a 30-day rolling basis" — OK. But `StoryLimitWidget` and other surfaces may show "stories today" / "daily" terminology elsewhere (legacy `daily_stories` field is still consulted as a fallback).
- **Impact:** Confusing limit messaging; parents see "3 today" when limit is actually rolling 30 days.

## 13. iOS `RequireSubscription` redirect during purchase race
- **Where:** `src/App.tsx` + `src/lib/iapService.ts`
- **What happens:** After Apple IAP success, `activateSubscriptionAfterPurchase` writes the DB row immediately, but `RequireSubscription` was evaluated before that write. The new state isn't observed until a navigation/remount; this commonly causes the "I just paid but it says subscribe required" loop on the first attempt.
- **Impact:** Friction immediately after the most important moment in the app (purchase).

## 14. `daily_streaks` accessed via `.single()` vs `.maybeSingle()` inconsistency
- **Where:** Various streak reads.
- **Impact:** When no streak row exists yet, `.single()` throws a PGRST116 swallowed by `catch` and the user is silently shown `0` streak — minor.

---

## What I recommend prioritizing
- **P0 (revenue / lockout):** #1, #2, #3, #9 — billing correctness.
- **P0 (UX trust):** #4, #5, #13 — paywall false positives.
- **P1 (correctness):** #6, #7 — progress/achievement integrity.
- **P2 (cleanup):** #8, #10, #11, #12.

## Next step
Tell me which group to plan fixes for (or "all P0", "everything", etc.) and I'll write the implementation plan. I'd suggest starting with the P0 billing group since #1 is actively over-charging cancelled web users.