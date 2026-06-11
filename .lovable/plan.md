## Why stories feel slower than before

Looking at `supabase/functions/generate-story/index.ts`, `src/lib/story.ts`, and `src/pages/Mission.tsx` against the live edge-function logs, three regressions are stacking on top of each other:

### 1. Triple-layer retry amplification (biggest offender)

A single scene request can now fan out into **up to 6 Anthropic calls**:

```text
Mission.tsx generateSceneWithRetry()      → 1 retry on !parsed
  story.ts isParseFailure() retry         → 1 retry on parse failure
    generate-story server retry           → 1 retry on stop_reason=max_tokens OR shape-invalid
```

The server-side retry (added in `supabase/functions/generate-story/index.ts` lines 1090–1110) already covers truncation and shape-invalid responses. The two client-side layers were written before that existed and now duplicate the work. Logs from today show exactly this: scene 5 was hit at 18:21:18, 18:21:19, and 18:21:28 with a server-side "Retrying scene generation" entry in between — three Sonnet calls (17 s each) for one user choice.

The `valid=false` retry trigger is also too aggressive: it retries whenever `isValidSceneShape` returns false, which happens for perfectly readable scenes that just don't tick every optional field.

### 2. Every new story burns a full Sonnet 4 call

`generate-story` line 740 hard-defaults non-guest users to `claude-sonnet-4-20250514`, and the Haiku switch only happens after `count >= 20` stories. For users still under 20 stories, every first scene is Sonnet (~15–20 s TTFB). The original design intent (per memory) was Sonnet for quality early on, Haiku once they have history — that's fine in principle, but combined with #1 the perceived cost is multiplied.

### 3. Token budget pushed up

Floor budgets were raised to 1800–2000 tokens (`getOptimalTokens`, `optimizedTokens` in story.ts). Sonnet output time scales roughly linearly with `max_tokens`, so ~+25 % output budget = ~+3–4 s per call. This was added to prevent truncation, but with the server-side retry already handling truncation it's mostly overhead.

### 4. No request de-duplication

`sceneCache` is keyed by inputs but only checked *after* the call resolves. There is no in-flight promise map, so a stray double-trigger (e.g. choice tap while a re-render fires) starts a parallel call instead of awaiting the existing one. `choiceLoading` mostly prevents this on the choice button, but the new-story bootstrap path (`Mission.tsx` line 576) and the `generateSceneWithRetry` wrapper don't share that guard.

---

## Fix outline

**A. Collapse the retry layers to one (server only).**

- `src/pages/Mission.tsx` lines 818–845: remove `generateSceneWithRetry`; call `generateNextScene` once and surface the error.
- `src/lib/story.ts` lines 384–404: remove the client `isParseFailure` retry. Keep the `_retry` flag plumbing in case we ever need it, but stop firing it automatically.
- Server (`supabase/functions/generate-story/index.ts` line ~1092): keep retry, but tighten the trigger to `stop_reason === "max_tokens" || !parsed` only — drop the `!parsedValid` branch so a slightly-off shape doesn't cost a second Anthropic round-trip. Lean on `isValidSceneShape` only for logging/metrics.

**B. Add an in-flight de-dupe in `src/lib/story.ts`.**

- Introduce a `Map<string, Promise<…>>` keyed by the same `cacheKey` already computed at line 352. If a call is in flight, return the existing promise instead of invoking again. Clear the entry in `finally`.

**C. Right-size token budgets.**

- `src/lib/story.ts` line 364: drop continuation floor from 1600 → 1300 (first scene stays at 2000).
- `supabase/functions/generate-story/index.ts` `getOptimalTokens` (line 789): continuation 1800 → 1400, new story 2000 → 1800. Retry path already widens to 1.6× so truncation is still covered.
- &nbsp;

&nbsp;

Quality and Implementation Check: Please run a strict code safety and edge-case audit on the performance optimizations just made across `supabase/functions/generate-story/index.ts`, `src/lib/story.ts`, and `src/pages/Mission.tsx`. 

Verify the following 4 guardrails are explicitly in place:

1. Promise Cache Leak Check (src/lib/story.ts):

   - Ensure every key added to the new `Map<string, Promise<...>>` in-flight map is GUARANTEED to be deleted in a `finally` block or `.catch()` handler. 

   - A failed network request must not leave a rejected promise stuck in the map, which would permanently lock that choice for the user.

2. Retry Conditions (generate-story/index.ts):

   - Confirm the `!parsedValid` / `!isValidSceneShape` condition was completely removed from the server retry triggers.

   - The server must only retry if the JSON is completely unparseable `!parsed`) or cut off `stop_reason === "max_tokens"`).

3. UI State Reset (src/pages/Mission.tsx):

   - Since `generateSceneWithRetry` was removed, ensure that if `generateNextScene` throws a raw error, the UI catches it.

   - Confirm a failed request cleanly resets `loading` and `choiceLoading` states so the UI never freezes in an infinite spinner.

4. Token Budget Check:

   - Verify that the lowered token floors (1300 client / 1400 server continuation) play nicely with the server's 1.6x retry multiplier without causing math underflows or errors.

If any edge cases are unhandled, point out the code vulnerability and provide the corrected blocks immediately. If everything is airtight, explain exactly how the code enforces each safeguard.

### Expected impact

- Worst-case scene generation drops from 3 sequential Sonnet calls (45–60 s) to 1 call with at most one server retry (~17–25 s).
- Typical happy-path scene drops ~2–4 s from the token-budget trim.
- Accidental double-fires from the bootstrap path stop costing a second call.
- If (D) ships, post-warmup users move to Haiku 4.5 within their first session instead of after 20 stories (~8–10 s per scene instead of ~17 s).

No schema, RLS, or auth changes. No UX copy changes. Edge function redeploys automatically.