

# Revised Multi-Account Abuse Prevention Plan

## Problem Recap

Free users get 3 stories per 30 days, enforced server-side by `user_id`. Creating a new account resets the counter. The current `device_id` is a client-side `crypto.randomUUID()` stored in localStorage/Preferences — trivially cleared or spoofed.

## Critique of Original Plan

| Issue | Risk | Assessment |
|-------|------|------------|
| Client-side `device_id` trust | High | UUID in localStorage can be cleared by reinstalling, clearing data, or incognito. Not a reliable anti-abuse signal on its own. |
| Raw device ID storage | Medium | Storing a persistent device identifier is PII under GDPR/CCPA. Needs hashing. |
| IP-only fallback | Medium | Shared IPs (schools, libraries — your target audience!) would block legitimate kids. |
| No DB index on new column | High | `COUNT(*)` on unindexed `device_id` across all `user_stories` rows degrades fast. |
| Backfill gap | Low | Existing stories have no `device_id`. 30-day rolling window means this self-heals. |

## Revised Approach: Layered Server-Side Fingerprinting

Instead of trusting the client `device_id` alone, combine multiple signals server-side into a hashed fingerprint. No single signal is definitive, but together they're hard to rotate simultaneously.

### Signal Collection (Edge Function)

Already available in the `generate-story` edge function request headers:

```text
IP Address:     x-forwarded-for / x-real-ip  (already extracted)
Client Device:  x-device-id header           (already sent)
User-Agent:     user-agent header             (free signal)
```

### Server-Side Fingerprint Hash

In the edge function, compute a **salted SHA-256 hash** combining these signals. This avoids storing raw PII:

```typescript
const fingerprint = await crypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode(
    `${SALT}:${deviceId}:${userAgent}:${ipPrefix}`
  )
);
```

- `ipPrefix`: Use only first 3 octets (e.g., `192.168.1`) to reduce shared-IP collisions while still being useful
- `SALT`: A secret stored in Supabase secrets, preventing rainbow-table reversal
- This hash is **not PII** — it cannot be reversed to identify a person

### Enforcement Logic: Soft Limits

Instead of hard-blocking on fingerprint match (which risks false positives in shared environments like schools), use a **tiered approach**:

| Fingerprint stories (30d) | Action |
|---|---|
| < 3 | Allow freely |
| 3–5 | Allow, but log a warning for monitoring |
| 6+ | Block new story generation, show upgrade prompt |

This gives a buffer for legitimate shared-device families while still capping abuse. The threshold of 6 means an abuser needs to create 3+ accounts AND rotate their device ID AND change their User-Agent — significantly harder than just making a new email.

### Database Changes

**Migration: Add `device_fingerprint` column + index**

```sql
ALTER TABLE user_stories 
  ADD COLUMN device_fingerprint text;

CREATE INDEX idx_user_stories_device_fingerprint 
  ON user_stories (device_fingerprint, started_at);
```

- Indexed on `(device_fingerprint, started_at)` for the 30-day rolling count query
- Column is nullable — existing rows simply won't have it (grace period, self-heals in 30 days)
- No backfill needed

**Add a secret for the fingerprint salt:**
- `DEVICE_FINGERPRINT_SALT` — a random string stored in Supabase secrets

### Edge Function Changes (`generate-story/index.ts`)

In the `isNewStory` block (around line 497), after the existing user-level check:

1. Compute fingerprint hash from request headers
2. Query `user_stories` by `device_fingerprint` across ALL users in last 30 days
3. If count >= 6 and no active subscription → block with 403
4. If count >= 3 → log warning
5. Store fingerprint on the new story record (pass it back or save directly)

### Client-Side Change (`databaseStory.ts`)

When saving a story, include the device fingerprint. Two options:
- **Option A**: Edge function writes the fingerprint directly when it detects a new story (cleaner, no client trust)
- **Option B**: Client sends device_id in header, edge function computes and stores hash

**Option A is preferred** — the edge function already has all the signals and can insert/update the fingerprint on the `user_stories` row after story generation succeeds.

However, the edge function doesn't create the `user_stories` row — `saveStoryToDatabase` in the client does. So the practical approach is:

- Edge function computes the fingerprint and returns it in the response
- Client stores it when saving the story to the database
- Edge function also validates against it on the next request

### Files to Create/Modify

| File | Change |
|------|--------|
| **Migration** | Add `device_fingerprint text` column + composite index to `user_stories` |
| **Supabase secret** | Add `DEVICE_FINGERPRINT_SALT` |
| `supabase/functions/generate-story/index.ts` | Compute fingerprint, query cross-account count, return fingerprint in response |
| `src/lib/databaseStory.ts` | Store returned `device_fingerprint` when saving story |

### What This Does NOT Do (And Why)

- **No Redis/Upstash**: The project uses Supabase Edge Functions with no existing Redis setup. Adding Upstash for a single COUNT query is over-engineering — the indexed query will handle thousands of users fine. Revisit if you hit 100K+ daily active users.
- **No CAPTCHA**: This is a children's app. CAPTCHAs are hostile UX for kids and may violate COPPA consent flows. The soft-limit tier approach achieves the same goal.
- **No IP hard-blocking**: Too many false positives for the target audience (kids at school, library).

### Privacy Compliance Summary

- Raw device IDs are never stored in the database
- Only a salted, irreversible SHA-256 hash is persisted
- The hash cannot identify a person or device without the salt
- The salt is a server-side secret, never exposed to clients
- IP addresses are truncated to /24 prefix before hashing
- No new PII is collected — all signals are already in HTTP headers

