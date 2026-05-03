## Goals

1. Eliminate horizontal scroll / content-too-wide on iPhone across Dashboard, Settings, Parent Dashboard, Subscription, and Auth/onboarding.
2. Fix StoryGallery showing "Continue Story" on stories that are actually completed.

Scope is intentionally narrow — no refactors, no design changes outside what's needed to stop overflow.

---

## 1. Stop horizontal scroll globally (root cause guardrail)

Add a single safety rule in `src/index.css` so any rogue child element (long words, wide images, untruncated emails, oversized grids) can't push the whole document sideways:

```css
html, body, #root { overflow-x: hidden; max-width: 100%; }
```

This is a defensive backstop, not a substitute for the per-component fixes below.

---

## 2. Per-page overflow fixes

### `src/pages/Subscription.tsx`
- Line 389: `grid-cols-1 md:grid-cols-3` for the 3 pricing/plan cards is fine, but the cards inside contain wide content. Audit the `max-w-4xl` container and ensure inner cards use `min-w-0` and text uses `break-words`.
- Wrap the outer page container with `overflow-x-hidden` and ensure the gradient header stays within `w-full`.

### `src/pages/ParentDashboard.tsx`
- Lines 236, 300, 368: stat grids use `grid-cols-2` on mobile. Add `min-w-0` to each grid cell wrapper and `truncate` / `break-words` to long values (e.g., emails, plan names) so a long string doesn't blow out the column.
- Add `overflow-x-hidden` to the root `<div>` (line 172).

### `src/pages/Settings.tsx`
- Line 146 root: add `overflow-x-hidden`.
- Audit any list rows showing the user's email — wrap in `truncate min-w-0`.

### `src/pages/Dashboard.tsx`
- Line 232 main: add `overflow-x-hidden`.
- Lines 553, 563, 655, 703 grids: add `min-w-0` to children where badges/long titles live so cards don't expand past viewport width.

### `src/pages/Auth.tsx` (line 596) and `src/pages/ProfileSetup.tsx` (line 393)
- Add `overflow-x-hidden` and ensure form containers use `w-full max-w-md` (not fixed pixel widths).

### `src/components/NativeOnboarding.tsx`
- Line 73 root already has `overflow-hidden`. Line 104 `max-w-[300px]` is fine on small screens but verify it doesn't exceed viewport on 320pt-wide devices — change to `max-w-[min(300px,100%)]`.

No changes to colors, fonts, spacing rhythm, or component structure — only width/overflow guards.

---

## 3. Fix "Continue Story" appearing on completed stories

The bug is in `src/pages/StoryGallery.tsx` lines 190–256. The condition `story.status !== 'completed'` is correct in code, so if completed stories still show "Continue Story", it means the DB row's `status` is not actually `'completed'` for those stories.

Looking at `src/pages/Mission.tsx` line 1457: completion calls `clearCurrentStoryInDatabase(savedStory.id)` which (per `src/lib/databaseStory.ts` line 356) does call `markStoryCompletedInDatabase`. However, the call is only reached if the user clicks the final "complete" button — if the user reaches the last scene but doesn't click through, the story remains `'active'` or `'paused'`, so the gallery correctly (per the data) shows "Continue Story".

Two-part fix:

**a. Defensive fallback in StoryGallery (`src/pages/StoryGallery.tsx`)**
Treat a story as completed if any of these are true:
- `story.status === 'completed'`, OR
- `story.completed_at` is set, OR
- `story.current_scene_index + 1 >= story.scene_count` AND `scene_count > 0`

Replace the inline `story.status !== 'completed'` checks (lines 190, 194, 244) with a single derived `const isCompleted = ...` per card. The "Completed" badge label, the "Share Story" button, and the `In Progress` ring all key off this flag. No DB changes.

**b. Self-heal on read (same file, in `loadStories`)**
After fetching, for any story that meets the fallback completion criteria but whose DB `status` is not `'completed'`, call `markStoryCompletedInDatabase(story.id)` once and update the local list. This fixes legacy rows on first view without a migration.

Same derived `isCompleted` should also be applied to the matching card in `src/pages/Dashboard.tsx` lines 766–812 so the home screen agrees with the gallery.

---

## Files touched

- `src/index.css` (add 1 rule)
- `src/pages/Dashboard.tsx`
- `src/pages/StoryGallery.tsx`
- `src/pages/Settings.tsx`
- `src/pages/ParentDashboard.tsx`
- `src/pages/Subscription.tsx`
- `src/pages/Auth.tsx`
- `src/pages/ProfileSetup.tsx`
- `src/components/NativeOnboarding.tsx`

No changes to story generation, auth flow, billing, edge functions, or design tokens.

---

## Out of scope (call out)

- No visual redesign.
- No changes to bottom nav, safe-area handling, or status bar (already correct per memory).
- Not touching admin/analytics, edge functions, or referral sharing.
