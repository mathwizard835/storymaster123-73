## THE FOLLOWING CHANGES SHOULD ONLY BE MADE TO THE MOBILE APP: Goal

Switch from "3 stories per 30 days" to a **hard paywall after 1 free story in-app**, reframed psychologically: not "pay for more stories" but **"pay to keep your adventure going — uninterrupted."**

The kid finishes their first complete story, then sees a celebratory "Keep the adventure going" prompt that routes to the paywall.

## Core behavior

- **New users:** 1 full free story (all scenes, start → end).
- **After completion:** End-of-story screen shows a "Keep the adventure going →" CTA → routes to `/subscription`.
- **Trying to start a 2nd story without a subscription:** Blocked with the same "Keep the adventure going" paywall messaging (not "limit reached").
- **Continuation scenes within story #1:** Always allowed — never interrupt an in-progress story.
- **Existing free users:** Immediate switch. If they've already used ≥1 story, next story start is paywalled.
- `**/try` landing demo:** Unchanged.

## Psychological reframe (copy)

Replace everywhere:

- ❌ "3 stories per month" / "Stories remaining" / "Monthly limit reached" / "Upgrade for unlimited stories"
- ✅ "Keep the adventure going" / "Your story continues with Adventure Pass" / "Don't let the story end here" / "Unlock the next chapter of every adventure"

The shift: **subscription = continuity, not quantity.**

## Files to change

### Gating logic

- `**src/lib/subscription.ts**` — `getStoriesRemaining`: replace 30-day rolling count with lifetime count of `user_stories` rows. Free cap = 1. Drop referral/streak bonus from gating. Return shape kept compatible but semantics now lifetime, not monthly.
- `**supabase/functions/generate-story/index.ts**` — Limit check: if user has active sub → allow. Else count `user_stories` rows; if ≥1 AND this is a new story (not continuation) → return 402 with code `paywall_required` and message "Keep the adventure going." Continuation requests always allowed.

### End-of-story prompt (new behavior)

- `**src/pages/Mission.tsx**` — On story completion, if user has no active subscription, show a celebratory completion screen with:
  - "🎉 The End!" headline
  - "Keep the adventure going" primary CTA → `navigate('/subscription')`
  - Secondary "Back to gallery" link
  - Subscribed users see the normal completion flow unchanged.

### Widgets / modals (reframe)

- `**src/components/StoryLimitWidget.tsx**` — Rewrite: free user with 0 used → "Your first adventure awaits"; with 1 used → "Keep the adventure going" CTA → `/subscription`. Remove progress bar / "X of 3" framing.
- `**src/components/SubscriptionModal.tsx**` — Headline: "Keep the adventure going." Subhead: "Unlimited stories, uninterrupted." Remove "3 stories per month" feature row from free tier display.
- `**src/components/ReferralWidget.tsx**` — Hide "earn free stories" messaging (bonus no longer affects gating).
- `**src/components/StreakWidget.tsx**` — Remove "bonus stories earned" reward display.

### Onboarding / marketing copy

- `**src/components/NativeOnboarding.tsx**`, `**src/pages/NativeWelcome.tsx**`, `**src/pages/Index.tsx**`, `**src/pages/Dashboard.tsx**` — Update any "3 stories" / "monthly limit" copy to the new continuity framing. Keep mentions of "1 free story to start" where signup value prop is shown.

### Memory

- Update `mem://billing/story-limits` to document: 1 free lifetime story, hard paywall, end-of-story "Keep the adventure going" prompt, continuation always allowed.
- Update Core memory line about limits accordingly.

## Out of scope

- No DB schema migration.
- No changes to `/try`, Stripe, RevenueCat, or webhooks.
- No grandfathering of existing free users.
- No new trial flow.

## Risk notes

- Existing free users mid-month lose remaining allotment immediately — acceptable per prior decision.
- Apple review: 1 real free story + clear continuity messaging is defensible (similar to Duolingo/Calm patterns).