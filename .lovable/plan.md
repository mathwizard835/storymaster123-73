## Scope
Implement every latency optimization from the previous plan **except** the model-strategy change. Keep the current Sonnet → Haiku-after-20-stories logic exactly as-is.

## Changes

### 1. Anthropic prompt caching (`supabase/functions/generate-story/index.ts`)
Switch the Anthropic request to the structured-content form and mark stable blocks with `cache_control: { type: "ephemeral" }`:
- `system`: array with the long `SYSTEM_PROMPT` as a single cached block.
- `messages[0].content`: split into two text blocks — the **stable prefix** (profile block, story-progress framing, schema/format instructions) marked cacheable, and a small **dynamic tail** (current scene context, scene number) uncached.
Result: scenes 2…N reuse the cached prefix (5-minute TTL on Anthropic's side) → big TTFB drop and ~90% cheaper input tokens.

### 2. Lower `max_tokens` defaults
`getOptimalTokens` becomes:
- new story: 1500 (was 3000)
- ending scene (≥12): 1400 (was 2500)
- mid scene: 1100 (was 2000)
Hard cap stays 4000. Narrative target is 215 words, so this leaves comfortable headroom while cutting generation time ~30%.

### 3. Trim prompt bloat
- Remove the duplicated "PROFILE REMINDER (RE-CHECK BEFORE WRITING)" block in `userPrompt` (the profile is already in the cached prefix and once is enough).
- Compress the inline JSON schema example to one line.
- Tighten `SYSTEM_PROMPT` (~40% shorter) without dropping any safety rules, mode rules, or required JSON keys.

### 4. Stream the scene to the client
Edge function:
- Add `stream: true` to the Anthropic call.
- Return the SSE body directly with `Content-Type: text/event-stream` when the client requests streaming (new `body.stream === true` flag so the existing non-streaming callers — quiz, guest demo cap logic — keep working).

Client (`src/lib/story.ts`):
- New `generateNextSceneStreaming(...)` that uses `fetch` against `${VITE_SUPABASE_URL}/functions/v1/generate-story` with the user's JWT, parses SSE line-by-line, accumulates `content_block_delta` text, and emits:
  - `onNarrativeDelta(text)` while the `"narrative":"..."` string is being produced (extracted from the partial JSON buffer with a small regex-based scanner).
  - `onComplete(parsedScene)` once the full JSON is closeable (existing `extractJSON` reused).
- Keep the existing `generateNextScene` for non-streaming callers (quiz, guest demo first call) and have the active story screen use the streaming variant.

Active story screen:
- Render the narrative text progressively (typewriter-style, just append as deltas arrive).
- Keep choice buttons disabled until `onComplete` fires (they need the parsed `choices` array).
- Perceived wait drops to ~1 s "first token".

### 5. Background prefetch of the next scene
In the active story screen, once a scene finishes streaming and is rendered:
- Wait 3 s (let the kid start reading) and fire `generateNextScene` (non-streaming) **once** for the most likely choice (heuristic: the first non-secret, non-item-locked choice).
- Cache the result in an in-memory map keyed by `${storyId}:${currentSceneIndex}:${choiceId}`.
- When the user taps a choice:
  - If we have a cached scene for that choice id → use it instantly (no network).
  - Otherwise → fall back to the live streaming call.
- Prefetch is **gated to Adventure Pass users only** to control Anthropic spend (checked via the existing `subscription` helpers; free users keep the current flow).
- Cache TTL: cleared when the story screen unmounts or when the story id changes; also bounded to at most 1 entry per scene index.

### 6. JWT verification cache (edge function)
Add a small in-memory map keyed by `sha256(JWT)` → `{ userId, expiresAt }`. On each request:
- If hit and not expired → skip `supabaseAuth.auth.getUser`.
- Else verify normally and cache the result with `expiresAt = exp claim` (or 5 min, whichever is sooner).
- Cap map size at 500 entries with simple LRU eviction.
Saves ~50–150 ms per continuation scene.

### 7. Skip redundant DB work
The 30-day story count, subscription lookup, and device-fingerprint check are already gated to `isNewStory` — leave that alone. The model-selection count query also runs every scene; gate it to `isNewStory` too and cache the chosen model in the JWT cache entry from change #6 so continuation scenes inherit it. (No behavior change — the model choice is stable within a story.)

## Out of scope (per your instruction)
- Model strategy. Sonnet stays the default for users with <20 lifetime stories, Haiku after. No change.

## Order of operations
1. Migration: none required.
2. Edit `supabase/functions/generate-story/index.ts` (changes #1, #2, #3, #4 server-side, #6, #7).
3. Edit `src/lib/story.ts` (streaming client + prefetch cache).
4. Edit the active story screen component to consume the streaming API and run the prefetch (will identify the exact file when implementing — likely `src/pages/Mission.tsx` or similar).
5. Manual smoke test: start a new story, watch narrative stream, confirm choice buttons enable after parse, tap through 2–3 scenes, verify prefetch hits via console log.

Ready to build this once you approve.
