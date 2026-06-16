## Root cause

Edge function logs for `generate-story` show every Anthropic call is failing:

```
Anthropic API error: 404 {"type":"not_found_error","message":"model: claude-sonnet-4-20250514"}
Anthropic stream error: 404 ... model: claude-sonnet-4-20250514
```

The model ID `claude-sonnet-4-20250514` is no longer served by Anthropic. It is hardcoded in three places in `supabase/functions/generate-story/index.ts`:

- Line 538 — quiz generation ("Quiz always uses Sonnet for quality")
- Line 753 — default story model for non-guest users with <20 stories
- Line 766 — fallback path

Because the streaming and non-streaming paths both fall through to the same broken model, every authenticated user under 20 stories gets a 404, which the client surfaces as "Story generation service is temporarily unavailable." This affects web AND mobile equally — mobile isn't special, it's just the platform you tested on.

(Note: the same user also tripped the "Premium soft cap reached 40/40" warning earlier in the logs. That's a separate, expected limit — not the cause of the outage.)

## Fix

In `supabase/functions/generate-story/index.ts`, replace the dead Sonnet ID with the current Anthropic Sonnet 4.5 model on all three lines:

- `claude-sonnet-4-20250514` → `claude-sonnet-4-5-20250929`

Haiku (`claude-haiku-4-5-20251001`) is already correct and stays as-is, so the "switch to Haiku after 20 stories" behavior is preserved.

No other code changes needed — request shape, prompts, token limits, streaming, and client-side error handling are all unaffected.

## Verification

1. Re-read `generate-story/index.ts` around lines 538, 753, 766 to confirm only the model string changed.
2. Call the deployed `generate-story` function once with a real auth token and confirm a scene is returned (HTTP 200, non-empty body) instead of a 404 in the edge logs.
3. Tail edge function logs to confirm no more `Anthropic API error: 404 ... model:` entries.
4. From the mobile preview, generate one story end-to-end and confirm the "Adventure interrupted" toast no longer appears.

## Out of scope

- The 40/40 soft cap warning (working as designed).
- Any change to Haiku routing, prompt content, or client error messages.
- Any refactor of the model-selection logic itself — only the literal model ID is wrong.