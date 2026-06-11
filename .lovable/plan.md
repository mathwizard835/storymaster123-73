## Problem

On the native iOS app (TestFlight), the home Dashboard renders content that extends past the right edge of the screen. Root cause is in `src/pages/Dashboard.tsx`:

The page wrapper uses `<div className="container py-4 md:py-8 px-4 md:px-8">`. Tailwind's `container` is configured in `tailwind.config.ts` with `padding: '2rem'` for **all** breakpoints. Because Tailwind merges these as separate CSS rules (not as a Tailwind override), the container's hardcoded 2rem padding combines with the wrapper's own `px-4`, and — more importantly — the `container` utility also sets a centered, fixed-width box at each breakpoint. On a 390px iPhone this is fine width-wise, but two child sections still overflow:

1. The Character Progress grid is `grid-cols-2` with `gap-4` and 5 stat tiles. With long titles like the last-earned character title (`{character.titles[...]}` shown next to the `Sparkles` icon — e.g. "Master Adventurer"), the inner `flex items-center gap-1` row uses `text-xl` with no `min-w-0`/`truncate`, so the tile pushes the grid track wider than the column allows, dragging the whole card past the viewport.
2. The "Recent Stories" and "Achievements" section headings use `text-2xl` + icon + dynamic count plus a "View All" button in a `flex items-center justify-between` row with no `min-w-0`/`flex-wrap`, which can also push past the right edge with longer counts on small screens.

Additionally, the wrapper's combination of `container` + extra horizontal padding shrinks usable width unnecessarily on phones. We should drop `container` on the native-phone path so the layout uses only `px-4`.

## Changes (all in `src/pages/Dashboard.tsx`)

1. **Wrapper padding**: change the outer wrapper from
   `<div className="container py-4 md:py-8 px-4 md:px-8">`
   to a phone-friendly version that skips `container` below `md`:
   `<div className="w-full md:container py-4 md:py-8 px-4 md:px-8">`.
   This keeps desktop/tablet behavior identical and gives the native phone full viewport width minus the intended 1rem gutters.

2. **Character Progress tiles** (lines ~563–596): add `min-w-0` to each tile `<div className="p-3 bg-muted/30 rounded-lg">` and wrap the value rows in `min-w-0` with `truncate` on the value text. Specifically the Title tile (lines 589–595) must use `truncate` on the title string so a long title cannot stretch its grid cell.

3. **Section headings** (Recent Stories line ~733 and Achievements line ~866): add `min-w-0 flex-1` to the `<h2>` and `truncate` to the count text, and add `gap-2 flex-wrap` to the parent `flex items-center justify-between` row so the "View All" button can wrap under on the narrowest phones rather than pushing the row wider.

4. **Recent Stories card meta row** (line ~800): the `flex flex-wrap gap-x-4 gap-y-1` row plus the Continue button at line 810 sits inside `flex justify-between items-center gap-2 min-w-0`. Add `min-w-0 flex-1` to the inner meta `<div>` so long "Scene X of Y" content cannot stretch it.

## Verification

- After changes, load `/dashboard` in the preview at iPhone widths (375×812 and 390×844) and confirm no horizontal scroll on the `<main>` and no clipped content on the right.
- Confirm tablet (820px) and desktop (≥1024px) layouts are visually unchanged — the `md:container` keeps the same centered, padded box.
- No business-logic or data changes; this is presentation-only.

## Out of scope

- No changes to the `NativeNavigationHeader` (already correct).
- No changes to `PremiumThemeSelector` or any data/store/edge function.
- No changes to the desktop "Adventure Dashboard" header.
