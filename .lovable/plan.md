

## Guest Instant-Story + Pricing Refresh

Goal: After splash, an unauthenticated user can build their hero and play a complete personalized story. When they finish, prompt to **save** → routes to sign up. Also: lower Adventure Pass price to **$4.99**, and make the upgrade button much more prominent.

### 1. Guest can start a personalized story without signup

**`src/App.tsx`**
- Make `/profile` and `/mission` **public routes** (no `ProtectedRoute` wrapper). Auth-only stays on `/dashboard`, `/gallery`, `/achievements`, `/parent-dashboard`, `/settings`, `/subscription`.

**`src/pages/Index.tsx` (web landing)**
- Replace the unauthenticated CTA "Sign Up!" with **"Start My Story"** → `navigate("/profile?new=true&guest=1")`.
- Keep "Log In" link in header for returning users.

**`src/pages/NativeWelcome.tsx` (iOS splash)**
- Primary CTA becomes **"Start My Story"** → `/profile?new=true&guest=1`.
- Secondary text-link "I already have an account" → `/auth`.

**`src/pages/ProfileSetup.tsx`**
- Already works without an account (uses `saveProfileToLocal`). No logic change required — just confirm the "Begin Adventure" button routes to `/mission?new=true` regardless of auth state.

**`src/pages/Mission.tsx`**
- Skip the `getStoriesRemaining()` gate when `!user` (guests aren't billed against the limit).
- Skip database persistence calls (`saveStoryToDatabase`, `markStoryCompleted`, `pauseStoryInDatabase`) when `!user`. Guest progress stays in `localStorage` only via existing `saveCurrentStory` / `saveCompletedStory`.
- At the **story-complete** moment (where authenticated users currently see the finish screen), if `!user`, render a new modal:
  - Title: **"Save Your Adventure?"**
  - Body: "Sign up to keep this story, unlock new ones, and track your hero's journey."
  - Buttons: **"Save & Sign Up"** → `navigate('/auth?postSignup=hydrate')`; **"Maybe later"** → `/` (story stays in localStorage).

**`src/pages/Auth.tsx`**
- After successful signup, if `localStorage` has a completed guest story or guest profile, write them to the database (reuse `saveStoryToDatabase` + `saveProfileToLocal`-driven sync) so the just-finished adventure shows up in their Gallery.

**`supabase/functions/generate-story/index.ts`**
- Already `verify_jwt = false`. Add a guard: if no `Authorization` header, skip user-scoped DB writes (subscription checks, user_stories inserts) but keep IP/device rate-limit. No schema changes.

### 2. Pricing change to $4.99

**Migration** (`supabase/migrations/<ts>_adventure_pass_499.sql`)
```sql
update public.subscription_plans
set price_monthly = 4.99
where lower(name) like '%premium%' or lower(name) = 'adventure pass';
```

**Code copy updates** (replace all `$6.99` strings):
- `src/pages/Subscription.tsx` — `basePlan.price = 4.99`, plus any "$6.99" labels.
- `src/components/SubscriptionModal.tsx` — header & comparison row.
- `src/pages/Index.tsx` — pricing mentions in marketing sections.
- Any other `$6.99` references found in landing/marketing copy.

**Stripe**: Existing `STRIPE_PREMIUM_PRICE_ID` env still controls the actual charge. Lovable will need a new $4.99 Stripe price created and the env updated — flagged as a follow-up step after migration.

**RevenueCat / iOS IAP**: Apple IAP price is set in App Store Connect, not in code. Mention that the iOS product price must be updated separately in App Store Connect; no code change required beyond the display strings.

### 3. Make "Upgrade" button shine

**`src/index.css`** — add a reusable shimmer keyframe:
```css
@keyframes shine {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.btn-shine {
  background-image: linear-gradient(110deg,
    hsl(var(--primary)) 0%,
    hsl(var(--accent)) 40%,
    #ffffff 50%,
    hsl(var(--accent)) 60%,
    hsl(var(--primary)) 100%);
  background-size: 200% 100%;
  animation: shine 2.4s linear infinite;
}
```

**Floating Adventure Pass button (`src/pages/Index.tsx`)**
- Expand from a circular icon into a pill with **icon + label "Get Adventure Pass · $4.99"**.
- Apply `btn-shine`, stronger glow (`shadow-[0_0_30px_rgba(168,85,247,0.7)]`), `ring-2 ring-yellow-300/60`, and a subtle bounce (`animate-bounce` once on mount, then idle pulse).

**Subscription modal CTA (`SubscriptionModal.tsx`)** — premium plan's "Subscribe" button gets `btn-shine`, larger size, and a Crown icon prefix.

### Technical notes

- No new tables. `subscription_plans` row update only.
- `Mission.tsx` guest branch reuses existing `localStorage`-backed helpers (`saveCurrentStory`, `saveCompletedStory`, `getCompletedStories`) — no new storage layer.
- `generate-story` edge function already supports anonymous calls; only adds an early-return path for DB writes when no JWT.
- Hydration after signup is best-effort (try/catch, never blocks the auth redirect).

### Flow diagram

```text
Splash / Landing
   │  Start My Story
   ▼
ProfileSetup  (guest, no auth)
   │  Begin Adventure
   ▼
Mission  (full personalized story, localStorage only)
   │  Story complete
   ▼
"Save Your Adventure?" modal
   ├─ Save & Sign Up → /auth → on success, hydrate guest story → /dashboard
   └─ Maybe later     → /  (story remains in localStorage)
```

