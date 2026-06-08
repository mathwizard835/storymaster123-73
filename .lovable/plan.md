
# Fix intermittent "Story Error" on choice tap

## Root cause

When the user taps a choice, `Mission.tsx` calls `generateNextScene` in `src/lib/story.ts`, which invokes the `generate-story` edge function. That function asks Anthropic for a JSON scene. Two intermittent failure modes:

1. **Truncated / malformed JSON** from Anthropic (most common). The edge function already has a single transparent server-side retry with a wider token budget; `story.ts` adds one more client-side retry. If both attempts still parse-fail, the function returns 422 `retryable: true`, the client throws, and `Mission.tsx` shows the destructive "Story hiccup" toast.
2. **Edge function 5xx / network blip** — same surface, same toast.

The user keeps their scene, but the toast is destructive (red) and doesn't make it obvious they can just tap the choice again. They read it as a hard error.

## Fixes

### 1. Auto-retry once more in `Mission.tsx` before showing the toast
In `onChoose` (src/pages/Mission.tsx), wrap the `generateNextScene` call in a small retry loop: on parse-failure / edge-function errors, wait ~600 ms and retry once. Total resilience becomes: server retry → client retry → onChoose retry = 3 attempts on a single tap. This catches the vast majority of transient Anthropic blips invisibly.

Do NOT retry on:
- `paywall_required` / story-limit errors (already not thrown as parse errors, but guard anyway)
- "Story session corrupted" / "Story session lost"
- Auth errors

### 2. Soften the failure toast to a recoverable "Tap your choice again"
When all retries are exhausted:
- Keep variant `destructive` but change the title from "Story hiccup" to "Try that choice again" and description to "The storyteller paused for a moment. Your scene is safe — tap your choice once more."
- This matches the reality (state is intact, just tap again) instead of suggesting data loss.

### 3. Defer item consumption until AFTER the AI call succeeds
Currently the `consumesItem` branch (lines 791-802) removes the item from inventory **before** `generateNextScene` runs. If the AI call ultimately fails, the user loses the item but didn't progress. Move the consumption + toast into the success path (right after `setScene(parsed)`), so a failed retry doesn't burn the item.

### 4. Bump the client-passed token budget for continuations
`generateNextScene(..., 1100, ...)` passes `max_tokens=1100`. The server clamps to a floor of 1800 anyway, but the explicit value is misleading and would cause real truncation if the server floor is ever lowered. Pass `1800` from the call site to make intent match behavior.

### 5. Log the raw Anthropic preview on parse failure
The edge function already logs the failed-parse preview server-side. On the client, when `generateNextScene` throws, also `console.warn` the `error.message` (includes the preview when present) so future occurrences are easier to triage from the user's console.

## Files touched

- `src/pages/Mission.tsx` — retry loop in `onChoose`, item consumption moved post-success, softer toast copy, bumped token budget.
- `src/lib/story.ts` — no behavior change required; optionally widen the existing client retry's backoff from immediate to ~400 ms to reduce hot-repeat failures.

## Out of scope

- Streaming/SSE rewrites of `generate-story` (separate latency plan, already discussed).
- Changing the Anthropic model — keep Sonnet/Haiku selection logic untouched.
- Pre-generating choices in the background (would help but is a larger feature).

## Expected outcome

Intermittent transient failures stop bubbling up to the toast at all. When a true failure does occur, the messaging tells the user exactly what to do (tap again) and they don't lose inventory.
