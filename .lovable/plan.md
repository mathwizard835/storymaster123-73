# Reduce story loading time



## 1. Parallelize the pre-LLM Supabase queries

In `serve()` for a new story we currently run, in series:

1. count user stories (30d)
2. count lifetime stories (native only)
3. fetch active subscription
4. count device-fingerprint stories
5. count for model selection

These have no dependencies on each other. Run them with `Promise.all`. Removes ~200-500ms on cold paths.

## 2. Move analytics + prompt-hash writes off the hot path

`supabaseAdmin.from("analytics_events").insert(rows)` and `rpc("bump_prompt_hash", ...)` are awaited before we return the scene. Wrap them in `EdgeRuntime.waitUntil(...)` so they run after the response is sent.

## Files touched

- `supabase/functions/generate-story/index.ts` — Parallelize pre-LLM queries with `Promise.all` and wrap analytics/prompt-hash writes in `EdgeRuntime.waitUntil`.

## Out of scope

- Pre-generating "common" first scenes into a cache (worth doing later, but needs an admin job).
- Replacing Anthropic with a different provider.
- Audio/Read-to-Me latency (separate path).