## Goal

Replace the current "marketing landing → auth → 6-step profile → story" funnel with a **story-first** flow: 3 curated story cards on app open, instant tap-to-read, cliffhanger conversion, optional signup after emotional engagement.

## Key architectural decision

The AI story engine (`generate-story` edge function) **requires authentication** and counts against story limits. So the 3 starter stories will be **pre-authored static content** bundled with the app — not AI-generated. This delivers:

- True <1s start (no network call, no auth)
- Zero AI cost on guest traffic
- Identical experience for every guest (testable, predictable hooks)
- Clean handoff: after signup, the AI engine takes over for story #4+

Each starter story = 3 short scenes ending in a cliffhanger, with one inline choice in scene 2.

## What gets built

### 1. New guest home `/` (replaces current Index for both web + native)

- Headline: **"Pick a story"**
- 3 large tap-cards, each with title + 1-line tease + cover gradient:
  - "The iPad That Started Talking Back"
  - "The Door Inside the Screen"
  - "The Message You Shouldn't Have Seen"
- No header, no nav, no auth prompt, no marketing copy
- Logged-in users get a small "Continue your adventure →" link to `/dashboard` (non-intrusive)

### 2. New guest reader `/story/:slug`

- Renders pre-authored scene immediately on mount (no spinner)
- Scene text fades in line-by-line (hook line first, ~80ms stagger)
- Scene 2 shows the inline choice (2 buttons)
- Scene 3 ends mid-sentence on a cliffhanger
- Tracks: card view, tap, scene reached, drop-off (anonymous, no PII)

### 3. Cliffhanger conversion screen

After scene 3:

- Title: **"Continue the story?"**
- Two buttons:
  - **"Continue now"** → reveals one more bonus paragraph then a soft prompt "Want the full ending? Save your progress." (no hard wall)
  - **"Save progress"** → goes to streamlined signup (`/auth?from=cliffhanger&story=<slug>`)

### 4. Streamlined post-cliffhanger signup

New compressed `/auth` mode when `?from=cliffhanger`:

- Single screen: email + password (Apple/Google sign-in buttons stubbed for native — Apple requires native SDK work, out of scope)
- COPPA age gate + parental consent **stay** (legal requirement, can't be skipped) — but visually compressed into one screen with progress dots
- After signup verification: skip the 6-step ProfileSetup entirely, go to a **2-tap interest screen** (Mystery / Comedy / Adventure / Thrill — single tap, "Skip" allowed), then resume the chosen story via the AI engine seeded with its premise

### 5. Lightweight analytics

New table `guest_analytics` (no user_id, just anonymous session_id in `sessionStorage`):

- `story_card_view`, `story_card_tap`, `scene_reached` (1/2/3), `cliffhanger_continue`, `cliffhanger_save`, `signup_completed_after_cliffhanger`
- RLS: insert-only for anon role, admin-only read

### 6. Pre-authored story content

New file `src/content/starterStories.ts` — 3 stories × 3 scenes each, written in Lexile ~600L, child-safe, following the Goal/Obstacle/Stakes/Twist structure from `mem://ai/story-generation-logic`. I'll have claude generate these in the implementation step.

## What gets removed / changed

- **Current `Index.tsx` marketing landing** → moved to `/about` (kept for SEO, no longer the home page)
- `**NativeWelcome` + `NativeOnboarding**` → deleted from boot flow; native and web both land on the new "Pick a story" screen
- `**NativeHomeRedirect` in `App.tsx**` → simplified to just render the new `GuestHome` component
- **6-step** `ProfileSetup` → kept as-is for users who later want to customize, but no longer in the signup critical path.

## What stays untouched

- AI story engine, story limits, RLS hardening, RevenueCat IAP, parental consent flow (COPPA legal floor), email verification, dashboard, gallery — all unchanged.

## Technical details

**Files to create**

- `src/content/starterStories.ts` — typed array of 3 stories
- `src/pages/GuestHome.tsx` — the "Pick a story" screen
- `src/pages/GuestStory.tsx` — pre-authored reader with cliffhanger
- `src/pages/PostSignupInterests.tsx` — 2-tap interest picker
- `src/lib/guestAnalytics.ts` — fire-and-forget anonymous event logger
- `supabase/migrations/<ts>_guest_analytics.sql` — new table + RLS

**Files to modify**

- `src/App.tsx` — `/` → `GuestHome`; add `/story/:slug`, `/about`, `/post-signup`; remove `NativeHomeRedirect` onboarding path
- `src/pages/Auth.tsx` — read `?from=cliffhanger&story=<slug>`, store in localStorage; on successful signup redirect to `/post-signup?story=<slug>` instead of `/dashboard`
- `src/pages/Index.tsx` — re-route to `/about` (no code change to the file, just route remap)

**Analytics table schema**

```sql
create table public.guest_analytics (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  event text not null,
  story_slug text,
  scene_index int,
  created_at timestamptz default now()
);
-- RLS: anon can insert, admins can select
```

**Cliffhanger "Continue now" behavior** — to honor "do not force signup" while keeping the conversion lever: show one bonus paragraph, then a *soft* prompt with a dismissible "Maybe later" link that loops back to `/`. No hard wall.

**Native onboarding slides** — deleted from boot. The 3 story cards ARE the onboarding.

## Out of scope (flag for later)

- Apple / Google native sign-in buttons (need Capacitor native plugins + Apple Sign In capability in Xcode)
- True "preload next story in background" while AI-engine reading (would need speculative scene generation — costs tokens)
- A/B testing different hook titles

## Open question

Should the **"Continue now"** path on the cliffhanger let guests get the *full* AI-generated ending without signing up (counting against the device's free 6-story-per-device limit), or stop at the bonus paragraph + soft signup prompt? Your spec says "no hard blocking" — I'm proposing the soft prompt because letting guests trigger the AI engine would (a) require lifting JWT auth on `generate-story` for guest tokens, which weakens anti-abuse, and (b) burn AI tokens on un-monetizable traffic. I'll go with the **soft prompt** unless you say otherwise. 

**Continue now → bonus paragraph → THEN emotional push**

But the *key upgrade*:

### Replace generic soft prompt with this:

Instead of:

> “Want the full ending? Save your progress.”

Do:

> “Leo hesitated.  
> The screen flickered again…
>
> **This is where your version of the story begins.**
>
> Save your progress to continue.”

That framing:

- feels personalized
- feels like ownership
- increases conversion