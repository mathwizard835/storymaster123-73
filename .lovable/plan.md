## Goal
Limit guest demo to one story per visitor, enforced **server-side** (not bypassable via devtools/localStorage). After use, the landing CTA flips to "Sign Up".

## Strategy
Track guest demo usage in a new Supabase table keyed by a SHA-256 fingerprint of `IP + User-Agent + salt` (same pattern already used in `generate-story` for device abuse limits). The edge function rejects a 2nd guest start from the same fingerprint.

## Changes

### 1. Database — new table `guest_demo_usage`
```
fingerprint   text primary key
ip_prefix     text
user_agent    text
used_at       timestamptz default now()
```
- RLS enabled, no policies (only service-role edge function writes/reads).
- Index on `used_at` for cleanup.

### 2. Edge function `supabase/functions/generate-story/index.ts`
- In the `isGuest` branch, compute the same fingerprint already used below (reuse `DEVICE_FINGERPRINT_SALT`, IP prefix, UA).
- Treat a request as the **start** of a demo when `body.scene == null` (no prior scene → first call).
- On start:
  - `select` from `guest_demo_usage` by fingerprint.
  - If row exists → return `403 { error: "demo_used" }`.
  - Else `insert` the fingerprint row before generating.
- Subsequent scenes (`body.scene != null`) for the same fingerprint pass through (continuing the in-progress demo) — they don't insert again.
- No change to authenticated flow.

### 3. `src/pages/TryStory.tsx`
- When `callGenerate` throws and the response includes `error: "demo_used"` (or status 403), set a new `stage = "demoUsed"` that renders:
  - "You've already tried your free demo."
  - Primary CTA → `/auth` ("Sign Up Free").
  - Secondary → `/` ("Back home").
- Remove the "Try another demo" reset button on `finished` stage.
- On `finished`, also write a local hint `localStorage.setItem("demo_story_used","1")` — purely a UX optimization so the landing CTA can flip without a server round-trip. Server remains source of truth.

### 4. `src/pages/Index.tsx` (hero CTA)
- Read `localStorage.getItem("demo_story_used")` on mount:
  - Unused → `🚀 Try a Story` → `/try` (current behavior).
  - Used → `✨ Sign Up Free` → `/auth`, and swap subtext to "You've used your free demo — create an account to keep playing."
- If the localStorage flag is missing but the visitor has actually used it, the server will still block them on `/try` and show the "already used" screen — so the limit holds either way.

### Notes
- Fingerprint is the same one already trusted for the 6-story-per-device cap, so this is consistent with existing anti-abuse posture.
- Determined attackers on changing IPs/UAs/incognito can still get extra demos — matches the existing device-fingerprint trust level; tightening further would require captcha and is out of scope.
- No schema changes to existing tables.
