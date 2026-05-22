# Fix intermittent "Story Error" on choice clicks

## Root cause

Edge function logs confirm the failure mode: Anthropic returns a JSON payload wrapped in ````json` fences that gets **cut off mid-object** (response ends mid-string at `"helped_wal...` with no closing brace and no closing fence). `extractJSON()` then fails every path — direct parse fails, the code-block regex requires a closing ````` (missing on truncated output), and the brace-counter never finds `braceCount === 0` — so it returns `null`, the edge function responds 422, and the client toasts "Story Error".

Three compounding bugs make this much worse than it needs to be:

1. **Token budget too tight.** `generateNextScene` defaults to `maxTokens=1100`. With `storyLength: "short"` it gets multiplied by `0.7` → ~770 tokens sent to the edge function; the edge function then enforces `getOptimalTokens` to `1800`/`2000`, but the **client value wins** when present (`Math.min(body?.max_tokens ?? optimal, 4000)`), so we're calling Claude with 770–1100 tokens for scenes whose JSON schema (narrative + choices + memory + items + HUD) regularly needs 1.5k–2.5k. Truncation is the norm, not an edge case.
2. **Failed parses get cached.** In `src/lib/story.ts` line 391, the client caches the result *whether or not* `parsed` is null. The next click hits the same `cacheKey` (5-min TTL) and returns the cached `{ parsed: null }` without ever calling the edge function — so retry #2 fails instantly with the same error. The user only escapes when inventory/memory/scene state changes enough to change the cache key.
3. **No retry on truncation.** Neither the client nor the edge function inspects `data.stop_reason === "max_tokens"` to retry with a larger budget; nor does either layer attempt a single transparent retry on a parse failure before surfacing an error.

&nbsp;

The plan is safe to deploy **provided you add two safeguards**:

1. **De-conflict the loops:** Ensure the `_retry: true` flag explicitly disables the Edge function's internal retry mechanism so you never hit a multiplier effect ($2 \times 2 = 4$ total LLM calls on a single failure).
2. **Validate after repair:** Never trust a repaired JSON object blindly without checking that its crucial schema fields are intact and complete.

## Fix

### `supabase/functions/generate-story/index.ts`

- Raise the **effective** floor for `max_tokens`: ignore client-supplied values below a safe minimum. Use `Math.max(clientValue, optimal)` instead of letting the client lower it, then cap at 4000.
- Strengthen the system prompt to forbid markdown fences ("Return ONLY raw JSON. No ```json fences. No prose before or after.").
- After the first Anthropic call, if `data.stop_reason === "max_tokens"` **or** `extractJSON(text)` returns null, **retry once** with `max_tokens` bumped to `min(max_tokens * 1.6, 4000)` and a stricter instruction appended ("Previous response was truncated/malformed — emit shorter narrative, complete valid JSON only").
- Add a last-resort JSON repair pass in `extractJSON`: if brace-count never balances, append the missing `"` / `]` / `}` based on the imbalance and try `JSON.parse` once more. This salvages most truncations where only the trailing string was cut.
- Only after both the retry and the repair fail should the function return 422.

### `src/lib/story.ts`

- In `generateNextScene`, **do not cache** when `parsed` is null — only write to `sceneCache` on success. This stops the "retry returns the same broken result" loop.
- Raise the default `maxTokens` param from `900`/`1100` callers to `1600`, and drop the `lengthMultiplier` shrink for `short` stories on continuation scenes (it's the JSON envelope, not the prose, that drives token usage).
- On a thrown error from the edge function whose message matches "Failed to parse" / "Invalid AI response" / 422, perform **one** transparent retry from inside `generateNextScene` before re-throwing. The retry sets a `_retry: true` flag in the body so the edge function can also widen its budget.

### `src/pages/Mission.tsx`

- No behavioral change required once the above land, but tighten the error toast copy so that on the (now rare) genuine failure the message says "The storyteller stumbled — tap your choice again" rather than the current generic "Story Error". The retry happens silently inside `generateNextScene`, so the user normally sees nothing.

## Technical details

- Files touched: `supabase/functions/generate-story/index.ts`, `src/lib/story.ts`, `src/pages/Mission.tsx`.
- No DB migration, no new secrets, no schema change.
- Feature flags / toggles: none — these are pure correctness fixes.
- Risk: a single retry doubles worst-case latency for the ~5% of scenes that currently fail; success path is unchanged. Higher `max_tokens` only affects the **ceiling** Anthropic is allowed to emit — average output length (and cost) is unchanged because the prompt still targets ~215 words of narrative.

## Validation

After deploy:

1. Force a truncation by temporarily setting `max_tokens: 400` and confirm the silent retry path produces a valid scene with no user-visible error.
2. Tail `generate-story` logs for `stop_reason=max_tokens` and confirm retry frequency drops to near zero with the new floors.
3. Click through a full short-length adventure (8 scenes) twice and confirm no "Story Error" toast appears.