Your Supabase org is on the Free plan and hit the **egress quota** (data transferred out of Supabase). Egress is not the same as database size — the tables are small (<2 MB total), so this is almost certainly outbound traffic from edge functions and database reads. If nothing changes, Supabase can restrict the project after July 22, 2026, which would block story generation and mobile app use.

This plan reduces the biggest egress sources without changing game behavior or story quality.

### 1. Audit the egress breakdown
- Confirm the dominant source in Supabase Dashboard → **Billing / Usage** → "Egress".
- Likely suspects: `text-to-speech` audio bytes, `generate-story` streaming responses, and `user_stories.scenes` JSONB reads.
- Add a small log in the three edge functions to record response byte sizes for one day so we can rank them.

### 2. Cache "Read-to-Me" audio on the client (highest impact)
**Problem:** every time a user taps "Read to Me", the full audio is regenerated and returned as base64 from the `text-to-speech` edge function. Audio is large and base64 inflates it by ~33%.

**Fix:**
- Add a `Map`/`indexedDB` cache in `src/lib/tts.ts` keyed by `hash(text + voiceId)`.
- Before calling the edge function, check the cache. If present, reuse it.
- Keep a 50-item LRU eviction so mobile storage does not grow unbounded.
- This is purely client-side; no Supabase egress is spent for cached audio.

### 3. Stop subscription polling from hammering the database
**Problem:** `nativePayments.ts` polls `getUserSubscription()` every 2 seconds for up to 10 attempts after a checkout — 10 full round-trips per purchase.

**Fix:**
- Replace the fixed 2-second poll with exponential backoff: 1s, 2s, 4s, 8s, 8s (max 5 checks instead of 10).
- Add a 60-second in-memory cache for `getUserSubscription()` so calls from other UI components do not repeatedly hit the same endpoint.
- Add a `stopPolling()` cleanup that halts polling if the user closes the paywall early.

### 4. Stop fetching full `scenes` JSONB on list views
**Problem:** `user_stories.scenes` is a JSONB column that can grow large. If the "Recent Stories" list or dashboard selects it, we transfer the whole story just to show a title and badge.

**Fix:**
- Audit all `from('user_stories').select('*')` / `select('scenes')` calls.
- For list views, select only `id, title, status, current_scene_index, scene_count, completed_at, started_at, last_played_at, shared_publicly`.
- Only fetch `scenes` when the user opens the story to continue reading.

### 5. Add a client-side subscription/entitlement short cache
**Problem:** `getUserSubscription()` is called from many places (`Mission.tsx`, `Dashboard.tsx`, `Settings.tsx`, paywall) and each call triggers a database query and joins `subscription_plans`.

**Fix:**
- Cache the resolved `{subscription, plan}` result in `subscription.ts` for 30 seconds, with a manual `invalidateSubscriptionCache()` called after a successful purchase or cancellation.
- This does not affect safety checks at the edge function; it only reduces repeated client-side reads.

### 6. Right-size heartbeat writes (no egress change, but protects other quotas)
**Problem:** The new `app_sessions` heartbeat writes every 15 seconds. This is inbound, not egress, but it still consumes Database Requests and Write Ops on the Free plan.

**Fix:**
- Keep the heartbeat at 15 seconds but only write if the user is actually authenticated.
- Add `last_heartbeat_at` to the in-memory session and only call `update()` if at least 15 seconds have passed since the last write (already the case, but add a guard in case the timer fires early).

### 7. Reduce edge-function response overhead where safe
**Problem:** `text-to-speech` returns base64 audio inside a JSON body. The response itself is pure egress.

**Fix:**
- After audio caching is in place, add a `skipIfCached` flag in the request that lets the client tell the server it already has the audio for a given hash. The server then returns a tiny `304`-style response instead of the full audio. (Only useful if multiple clients share a device/account, but cheap to add.)
- For `generate-story` non-streaming responses, keep the trimmed schema from the earlier fix so empty arrays/objects are omitted.

### 8. Measure and verify
- Re-check the Supabase Dashboard usage after 24–48 hours.
- If audio caching alone does not drop egress below the Free threshold, we will either switch to Supabase Storage with a short CDN-style cache or recommend the Pro plan. The plan is ordered so the first 5 items are pure code optimizations.

### What will NOT change
- Story content, length, or quality.
- User experience for "Read to Me" (first play is still generated; replays are instant).
- Security: edge functions still enforce limits and auth checks; no client-side bypass is introduced.
- Paywall behavior: subscription status is still validated server-side; only the client-side cache is added.