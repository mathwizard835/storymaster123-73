## Goal

Cut perceived story latency from ~15 s to ~1–2 s first paint, with zero change to story quality and zero gameplay regressions. Two coordinated changes:

- **A. Server-side streaming** of the Anthropic response, with a progressive narrative reveal on the client.
- **B. Schema-overhead trim** in the prompt (NOT narrative length) — fewer JSON wrapper tokens, same prose budget.

## Quality guarantees (explicit)

- Narrative word target stays **215 words max**, same Lexile mapping, same mode/tone instructions, same `SYSTEM_PROMPT`, same protagonist-name rules. Nothing about story craft moves.
- The final parsed `Scene` object on the client is **byte-identical** to today — same `extractJSON` path, same `isValidSceneShape` validation, same fields. Streaming only changes *how* the bytes arrive, not what they are.
- All existing safety filters (`BLOCKED_PATTERNS`, profile validation, post-parse warnings) remain in the same order on the assembled full text before it's returned to the client.

## Bug-prevention guarantees (explicit)

- Streaming is **opt-in via a request flag** (`stream: true`). If the client doesn't set it (e.g. quiz call, any future caller), the function falls back to today's exact non-streaming path. No existing caller breaks.
- The client wraps the streaming call in a try/catch that **falls back to the existing non-streaming `supabase.functions.invoke` path** on any error (network drop, parse failure, abort). Worst case: same latency as today, never worse.
- Server-side retry-on-truncation logic is preserved. If the stream ends with `stop_reason === "max_tokens"` or `extractJSON` returns null, the server re-runs the existing non-streaming retry against Anthropic and emits a final `event: scene` frame with the retried result, so the client always gets a valid `Scene` or a clean error.
- In-flight de-dupe map in `story.ts`, scene cache, story-ID continuity checks, inventory/memory handling in `Mission.tsx` — all untouched.
- No DB schema changes. No RLS changes. No new secrets. No new dependencies.

---

## A. Streaming implementation

### A1. `supabase/functions/generate-story/index.ts`

Add a streaming branch *before* `let response = await callAnthropic(...)`:

```text
if (body?.stream === true) {
  // 1. Call Anthropic with `stream: true` (same model, same prompt, same max_tokens).
  // 2. Return a ReadableStream with `Content-Type: text/event-stream`.
  // 3. Forward Anthropic's SSE deltas to the client as `event: delta` frames
  //    (payload = the raw text chunk being appended).
  // 4. Accumulate the full text server-side as it streams.
  // 5. On stream completion:
  //      - run the SAME extractJSON + isValidSceneShape + retry logic
  //        already at lines 1087–1120
  //      - run the SAME analytics + profile-validation block
  //      - emit a final `event: scene` frame with { parsed, text, usage, model }
  //      - close the stream
  // 6. On any error mid-stream, emit `event: error` with a retryable flag and close.
}
```

The non-streaming branch below remains unchanged so quiz generation and any external caller keep working.

### A2. `src/lib/story.ts`

Extend `generateNextScene` with an optional `onNarrativeDelta?: (partial: string) => void` callback:

- If the callback is present, call the function via `fetch()` against the function URL (constructed from `import.meta.env.VITE_SUPABASE_URL` + auth header) with `stream: true`, parse the SSE frames, accumulate `delta` chunks into a buffer, and on every delta run a lightweight regex that extracts the in-progress `"narrative":"..."` substring and forwards the unescaped text to `onNarrativeDelta`.
- On the final `scene` frame, resolve with the same `{ text, parsed, raw, deviceFingerprint }` shape as today.
- On any error or unexpected close, **fall back** to a non-streaming `supabase.functions.invoke("generate-story", { body: { ..., stream: false } })` call. The promise either resolves with a valid scene (slow path) or rejects exactly like today.
- In-flight de-dupe map keys on the same `cacheKey` so a stream + a parallel non-stream request for the same scene collapse to one call.
- The successful-parse `sceneCache.set(...)` write still happens after the final frame, identical to today.

### A3. `src/pages/Mission.tsx`

- Add a `streamedNarrative` state and pass `onNarrativeDelta: setStreamedNarrative` into both `generateNextScene` call sites (line 576 bootstrap and line 821 choice).
- Render `streamedNarrative` in the existing scene-narrative slot while `choiceLoading` is true. When `parsed` resolves, swap to `parsed.narrative` (identical text, but now fully styled with paragraph breaks). Clear `streamedNarrative` in the same `finally` block that resets `choiceLoading`.
- HUD, choices, inventory updates, interactive objects, memory writes, `saveCurrentStory` — all run **after** `parsed` resolves, exactly as today. No partial-parse gameplay state.

### A4. Failure-mode matrix


| Failure                                              | Behavior                                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `stream: true` request times out / aborts mid-stream | Client `fetch` rejects → fallback to `supabase.functions.invoke` non-stream path → identical to today                |
| Anthropic emits malformed delta                      | Server keeps accumulating; final parse uses existing retry; client never sees broken JSON                            |
| Final `parsed` is null after retry                   | Server emits `event: error { retryable: true }` → client throws → existing `catch` resets `choiceLoading` and toasts |
| User taps a second choice while streaming            | Existing `choiceLoading` guard blocks the tap (unchanged)                                                            |
| Quiz call (`/Mission.tsx` line 1416)                 | Does not set `stream: true` → uses existing path → unchanged                                                         |


---

## B. Schema-overhead trim (zero narrative impact)

The current schema example in the prompt (line 912) advertises every optional field on every scene, which the model dutifully emits even when empty:

```json
"interactiveObjects":[{...}],"itemsFound":[{...}],"memory":{"flags":[],"pastChoices":[]}
```

On a continuation scene with no new items and no interactive objects, that's ~150–250 wasted output tokens per scene. Two surgical changes:

### B1. Tell the model to omit empty optional arrays

In `stablePrefix` (line 908), append one line to `SCENE REQUIREMENTS`:

```text
- Omit `interactiveObjects`, `itemsFound`, and `memory.flags` entirely when empty — do NOT emit empty arrays or placeholder objects.
```

Client-side, `Mission.tsx` already guards with `if (parsed.itemsFound && parsed.itemsFound.length > 0)` and `interactiveObjects?` optional chaining, so missing arrays are already safe. No client change needed.

### B2. Compress the schema example itself

Replace the verbose inline example on line 912 with a tighter version that drops the optional sub-fields (`requiresItem`, `consumesItem`, `requiresAbility`, `actions`, sub-types) from the example — they stay valid in the type system, but removing them from the example saves ~80 tokens of input AND signals the model to only emit them when relevant. The full schema is still described in `SYSTEM_PROMPT` (line 305+) so the model knows the optional fields exist.

### B3. What we explicitly do NOT change

- Narrative word target: **stays 215 max**.
- Lexile vocabulary instructions: **unchanged**.
- Mode tone blocks (comedy/thrill/mystery/explore/learning): **unchanged**.
- `SYSTEM_PROMPT`: **unchanged**.
- Token budgets (`getOptimalTokens`): **unchanged** — the trim reduces actual output, not the cap.
- Profile-validation warnings: **unchanged**.

Expected savings: ~150–250 output tokens per continuation scene = ~1–2 s shaved off wall time on Haiku 4.5. Combined with A, first-word latency drops to ~1–2 s and full-scene completion to ~10–12 s on continuation scenes.

---

## Verification plan

1. After deploy, generate 3 stories end-to-end on web preview (one each: comedy/thrill/mystery). Confirm:
  - First narrative word appears within ~2 s of choice tap.
  - Final rendered narrative matches `parsed.narrative` exactly (no duplication, no missing paragraphs).
  - Inventory pickups, interactive objects, memory flags, and end-of-story triggers still fire on the right scenes.
2. Force a streaming failure (temporarily throw inside the SSE handler) and confirm fallback path produces a valid scene.
3. Inspect `generate-story` logs: `Story generation completed, length:` should drop by ~150–250 chars on continuation scenes; `stop_reason` should stay `end_turn`.
4. Run the quiz flow (Mission line 1416) once to confirm the non-streaming path is untouched.

## **### Quality and Implementation Audit Check**

Please run a strict cross-file code safety and edge-case audit on the streaming and schema-trim refactor just implemented across `supabase/functions/generate-story/index.ts`, `src/lib/story.ts`, and `src/pages/Mission.tsx`. 

Verify that the following 4 technical guardrails are explicitly handled:

1. SSE Buffer Stream Boundary Guard (src/lib/story.ts):

   - Inspect the lightweight regex / chunk accumulator parsing the incoming text buffer.

   - Verify that if an Anthropic chunk boundary splits a JSON escaped sequence (like breaking `\"` or `\n` across two distinct network packets), the parser does not throw a JSON or syntax exception and freeze the progressive text delivery.

2. Endpoint URL Cleanliness (src/lib/story.ts):

   - Check how the direct fetch URL is constructed using `import.meta.env.VITE_SUPABASE_URL`.

   - Ensure the concatenation is defensive against trailing slashes (e.g., preventing a broken URL route like `https://xyz.supabase.co//functions/v1/generate-story`) which would trigger immediate CORS failures and break the stream handshake.

3. Structural Validation Schema Alignment (generate-story/index.ts):

   - Look at the server-side validator logic. Since the model is now explicitly instructed to OMIT empty arrays `interactiveObjects`, `itemsFound`, `memory.flags`) instead of printing `[]`, verify that the parser/validator treats missing arrays as structurally valid.

   - Ensure that omitting these fields does not accidentally trigger an unwanted server-side truncation or shape-invalid retry iteration loop.

4. UI Text Layout Consistency (src/pages/Mission.tsx):

   - Review the text wrapper swap where `streamedNarrative` gives way to `parsed.narrative`.

   - Confirm that the typography CSS, layout properties, line-heights, and spacing configuration of the streaming view exactly match the final component wrapper to eliminate any visual flickering or abrupt layout text shifts when the stream finalizes.

If any of these specific edge cases are missing or vulnerable to race conditions, point out the code vulnerability and provide the corrected file sections immediately. If everything is airtight, explain exactly how the code enforces each safeguard.

## Files touched

- `supabase/functions/generate-story/index.ts` — add streaming branch (A1) + 2-line prompt tweak (B1, B2).
- `src/lib/story.ts` — add `onNarrativeDelta` + SSE client + fallback (A2).
- `src/pages/Mission.tsx` — pass callback, render progressive narrative, clear on finalize (A3).

No other files, no migrations, no new packages.