## Goal

When a user with an active subscription signs in, send them to `/dashboard` reliably instead of bouncing them to `/subscription?required=true`.

## Root cause

`RequireSubscription` (in `src/App.tsx`) runs `getUserSubscription()` the instant `/dashboard` mounts after sign-in. On native that check often races the auth session being attached, so the RLS-protected `user_subscriptions` query returns nothing, the local positive-entitlement cache is empty on a fresh login, and the user is redirected to the paywall — even though they're paid.

## Changes

### 1. `src/pages/Auth.tsx` — `handleSignIn`

After `signInWithPassword` succeeds (native path, just before `navigate('/dashboard')`):

- `await getUserSubscription()`.
- If `plan` is present and `plan.name.toLowerCase() !== 'free'`:
  - Write the positive entitlement cache key `smq.sub.known.<user.id>` so `RequireSubscription` short-circuits.
  - `navigate('/dashboard')`.
- Else: `navigate('/subscription?required=true')` (deterministic, same destination they get today).
- Wrap in try/catch; on error, default to `/dashboard` so transient failures don't paywall a paying user.

No change to the web→native handoff branch.

### 2. `src/App.tsx` — `RequireSubscription`

- Pull `loading` from `useAuth()` and gate the first check on `!loading && user` so it doesn't run before the session is wired.
- If the first check returns `active === false`, do exactly one silent retry after ~800ms before flipping `hasSub` to false. This covers the cold-start race without weakening the paywall.
- Keep the existing positive-cache fail-open path on thrown errors.

### 3. No other changes

- No DB migration, no edge function, no new routes, no UI.
- Free-user behavior is unchanged: still routed to `/subscription?required=true`.

## Files - ONLY EDIT THESE FILES

- `src/pages/Auth.tsx`
- `src/App.tsx`

## Verification

- Sign in as a known premium user on native → lands on `/dashboard`, no paywall flash.
- Sign in as a free user → lands on `/subscription?required=true` as before.
- Sign in on web → unchanged (handoff URL path is not touched).