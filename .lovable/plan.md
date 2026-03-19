

## Fraud and Abuse Prevention Plan

### Vulnerabilities Identified

1. **CRITICAL: `upgradeSubscription()` lets anyone self-activate a paid plan** — It inserts directly into `user_subscriptions` with any `plan_id`, no payment verification. Any user can open the browser console and call this to get unlimited stories for free.

2. **CRITICAL: `generate-story` has `verify_jwt = false`** — Anyone on the internet can call the edge function without authentication, burning Anthropic API credits. The rate limiter is in-memory and resets on cold starts.

3. **HIGH: Device ID is client-generated and stored in localStorage** — Users can clear storage or use incognito to get a new device ID, resetting their free story count.

4. **HIGH: Story limits enforced client-side only** — The edge function does not check subscription status or story limits before calling the Anthropic API. All limit checks happen in the browser and can be bypassed.

5. **MEDIUM: Multi-account abuse** — Users can create multiple accounts with different emails to get 3 free stories each. No IP or fingerprint throttling on sign-up.

6. **MEDIUM: `SubscriptionModal` calls `upgradeSubscription` directly** — The web upgrade modal bypasses Stripe entirely by inserting a subscription row without payment.

---

### Fix Plan

#### 1. Enable JWT verification on `generate-story`
- Set `verify_jwt = true` in `supabase/config.toml` for `generate-story` and `text-to-speech`
- The client already sends the auth token via `supabase.functions.invoke()`, so no client changes needed

#### 2. Server-side story limit enforcement in `generate-story`
- Before calling Anthropic, query `user_stories` count for the authenticated user (from JWT `sub`) in the last 30 days
- Query `user_subscriptions` to check if they have an active paid plan
- If free user and count >= 3, return 403 with "Story limit reached"
- This makes client-side bypasses irrelevant

#### 3. Remove `upgradeSubscription()` from client-side code
- Delete the `upgradeSubscription` function from `src/lib/subscription.ts`
- Remove its usage from `SubscriptionModal.tsx` (the modal should only link to Stripe checkout or native IAP)
- Subscriptions should ONLY be activated by:
  - Stripe webhook (web purchases)
  - `activateSubscriptionAfterPurchase` after verified RevenueCat purchase (iOS)
- This closes the biggest fraud vector

#### 4. Add server-side subscription validation
- In the `generate-story` edge function, after JWT verification, check the user's subscription status using the service role key
- Use `user_id` from the JWT for story counting instead of the client-provided `device_id`
- This prevents device ID manipulation

#### 5. Rate limit sign-ups by IP (edge case)
- Add a simple check in the `generate-story` function: if a user has created an account in the last hour AND already hit their free limit, throttle more aggressively
- This is lower priority since JWT + server-side limits already block most abuse

---

### Files to Change

| File | Change |
|---|---|
| `supabase/config.toml` | Set `verify_jwt = true` for `generate-story` and `text-to-speech` |
| `supabase/functions/generate-story/index.ts` | Add server-side story limit check using JWT user ID and subscription status |
| `src/lib/subscription.ts` | Remove `upgradeSubscription()` function |
| `src/components/SubscriptionModal.tsx` | Remove direct upgrade call; route to Stripe checkout instead |
| `supabase/functions/text-to-speech/index.ts` | Add subscription check (Read-to-Me is a paid feature) |

### What This Prevents

- Free users bypassing story limits via console/API calls
- Users self-activating paid plans without payment
- Unauthenticated API abuse burning Anthropic credits
- Device ID manipulation to reset free story counts
- Multi-account abuse is mitigated by server-side per-user limits tied to authenticated identity

