## Goal

1. Make stories truly unlimited for paying subscribers (no more 40/30d soft cap).
2. Add a new "Subscriber usage tiers" panel to `/admin/analytics` showing, for active subscribers in the last 30 days, what % generated at least 20, 40, 60, 80, and 100 stories.

## Changes

### 1. Lift the subscriber cap (`src/lib/subscription.ts`)

- In `getStoriesRemaining`, change the subscriber branch so `monthlyLimit = Number.POSITIVE_INFINITY` (and `remaining = Infinity`) when the user has an active premium plan.
- Update the inline comment that says "Subscribers: 40/30d soft cap" to "Subscribers: unlimited".
- Keep web free (3/30d) and native non-subscriber (hard paywall) behavior unchanged.
- Audit downstream usage: any UI that renders `remaining` for subscribers should show "Unlimited" instead of a number. Touch only the minimum required (`StoriesRemaining` display + paywall copy if it still references "40").

### 2. Update any "40 stories" marketing copy

- Search the codebase for the literal `40` tied to stories and rewrite to "Unlimited" on:
  - Paywall (`src/pages/Subscription.tsx`)
  - Any feature/benefit lists, onboarding slides
- No change to Stripe prices, plans table, or billing logic.

### 3. Admin analytics — new subscriber tier metric

#### Edge function (`supabase/functions/analytics-rollup/index.ts`)

At the end of the handler (alongside the existing `activeSubsCount` query), add:

```text
- Fetch all active subscriptions:    user_subscriptions where status='active'  → list of user_ids, plus total count.
- Fetch story counts per user in last 30 days:
    user_stories where user_id in (...) and started_at >= now()-30d
    Aggregate count per user_id in JS (single select, paginated if >1000).
- Build buckets: at_least_20, at_least_40, at_least_60, at_least_80, at_least_100.
    For each threshold T: count of subscribers whose 30d story count >= T.
    Percentage = count / total_active_subs (0 if no subs).
```

Return a new top-level key in the JSON response:

```text
subscriber_usage: {
  window_days: 30,
  total_active_subscribers: <n>,
  tiers: [
    { threshold: 20, subscribers: <n>, percent: <0..1> },
    { threshold: 40, ... },
    { threshold: 60, ... },
    { threshold: 80, ... },
    { threshold: 100, ... },
  ],
}
```

Note: this window is always 30 days regardless of the dashboard `days` selector, because the question is "monthly usage tiers". Document this in the response.

#### Admin UI (`src/pages/AdminAnalytics.tsx`)

- Extend the `Rollup` type with `subscriber_usage`.
- Add a new `<Card>` section titled "Subscriber usage tiers (last 30 days)" with one row per threshold:
  - Label: "≥ 20 stories", "≥ 40 stories", etc.
  - Right side: `{percent}%` and `({subscribers} of {total})`.
- Use a simple horizontal progress bar (existing shadcn `Progress` component) to visualize each tier.
- Show empty state if `total_active_subscribers === 0`.

## Technical notes

- `user_stories.started_at` is the column the existing limit logic already uses, so it's the right field for "stories this month".
- If subscriber count exceeds Supabase's 1000-row default, paginate both queries with `.range()`.
- No DB schema change, no migration, no new secrets.
- Memory `mem://billing/story-limits` should be updated after build to reflect "subscribers: unlimited (was 40/30d)".