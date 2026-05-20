# Native Onboarding Flow Overhaul

Replace the current "1 free story then paywall" model with a guided funnel: **Feature Tutorial → Account Creation → Hard Paywall**. No story generation is possible until the user subscribes.

## New Flow (Native iOS only)

```text
App Open
  └─> NativeOnboarding (5 feature slides, swipeable + tappable)
        └─> NativeWelcome / Auth (Sign Up or Log In)
              └─> Email verification + COPPA consent (existing)
                    └─> Subscription Paywall (hard block, no skip)
                          └─> [Subscribed] → Dashboard → full app
                          └─> [Not subscribed] → stuck on paywall (Settings/Logout only)
```

Web flow is unchanged (marketing site at `/`, web app keeps 3/30d limit).

## 1. Expanded Tutorial (5 slides)

Rewrite `src/components/NativeOnboarding.tsx` from 3 generic slides to 5 outcome-focused feature slides. Each slide gets an animated visual demo (not just an icon) showing the *benefit*, not the feature name.

| # | Slide | Visual demo | Headline | Outcome |
|---|-------|-------------|----------|---------|
| 1 | Interactive Stories | Animated story page with tappable choice buttons that highlight | "Stories that listen to your child" | Kids drive the plot — they're not passive |
| 2 | Read-to-Me Narration | Sound wave animation + speaker icon, sample sentence highlighting word-by-word | "Pro narration brings every scene to life" | Reluctant readers stay engaged |
| 3 | Reading Level Match | Animated Lexile slider 200L → 1200L with sample text re-flowing | "Grows with your reader" | Always the right challenge level |
| 4 | Safe & Parent-Approved | Shield + parent dashboard mini-preview | "Zero scary content, full parent visibility" | Trust + COPPA reassurance |
| 5 | Real Reading Progress | Animated streak/XP bar filling, badges popping | "Screen time that builds skills" | Measurable outcomes vs. Roblox |

Slides remain swipeable with dot indicators and Skip button (skip still leads to Welcome → Auth → Paywall, so no escape from the funnel).

## 2. Force Auth + Paywall After Tutorial

**`src/components/NativeOnboarding.tsx`**: on completion, route to `/auth` (not just close to NativeWelcome). Keep `hasSeenOnboarding` flag so returning unauthenticated users don't see tutorial again — they go straight to Welcome/Auth.

**`src/App.tsx`** — add a new `RequireSubscription` gate on native:
- After login, check subscription status (existing `subscription.ts` helpers + RevenueCat).
- If user is authenticated but NOT subscribed → force redirect to `/subscription` for ALL app routes except `/subscription`, `/settings`, `/auth`.
- `/subscription` on native hides its back button and dismiss affordances when reached via this gate (query param `?required=true` or context flag).

**`src/pages/Subscription.tsx`**: when `required=true`, hide close/back, show messaging like "Start your Adventure Pass to unlock StoryMaster Kids", emphasize Read-to-Me + safety + level matching (mirroring tutorial promises).

**`src/pages/NativeWelcome.tsx`**: update subtitle pill "3 free stories • No credit card required" → remove (it's now misleading). Replace with "Free 7-day trial" only if billing supports it, else just remove.

## 3. Remove "1 Free Story" Logic on Native

**`supabase/functions/generate-story/index.ts`**:
- Native + non-subscriber + new story (scene 1) → return `402 subscription_required` immediately (no lifetime-1 grace).
- Continuation scenes for non-subscribers: also blocked on native (since they shouldn't have any in-progress stories anyway after rollout; safe guard).
- Web logic unchanged.

**`src/lib/subscription.ts`**: `getStoriesRemaining` on native for free user returns `0` (not 1). Subscribed cap (40/30d soft) unchanged.

**`src/pages/Mission.tsx`**: remove `showKeepGoingDialog` end-of-story interception (no free stories will reach that state). Leave dashboard navigation default. Keep the dialog component code commented or remove — minimal scope.

**`src/pages/Dashboard.tsx`**: "Start a New Adventure" button on native for non-subscribers → routes to `/subscription?required=true` instead of `/mission`.

## 4. Existing Free Users (Immediate Paywall)

No DB migration required. The `RequireSubscription` gate runs on every native app open. Anyone who used their 1 free story (or didn't) now sees the paywall the next time they open the app. In-progress stories are not preserved beyond viewing in Gallery (read-only) — actually with hard block they can't reach Gallery either. Acceptable per user's "immediate paywall" choice.

## 5. Files to Edit

- `src/components/NativeOnboarding.tsx` — expand to 5 feature slides with animated demos
- `src/App.tsx` — add `RequireSubscription` gate for native app routes
- `src/pages/Subscription.tsx` — `required=true` mode (no dismiss, outcome-focused copy)
- `src/pages/NativeWelcome.tsx` — remove "3 free stories" copy
- `src/pages/Mission.tsx` — remove `showKeepGoingDialog`
- `src/pages/Dashboard.tsx` — redirect to paywall instead of mission for non-subscribers
- `src/lib/subscription.ts` — native free users get 0, not 1
- `supabase/functions/generate-story/index.ts` — remove 1-lifetime native grace, return 402
- `mem://billing/story-limits` + `mem://index.md` — update to reflect new model

## Out of scope

- Free trial billing (Apple IAP introductory offer) — not adding unless asked.
- Web flow changes.
- Refunds / comms to existing free-tier users.
