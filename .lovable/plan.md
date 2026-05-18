Add a fixed Sign Up / Log In control to the upper-right of the landing page (`src/pages/Index.tsx`).

## What to build

- A small auth control pinned to the top-right of the landing hero, visible above the hero image.
- Two actions:
  - **Log In** — ghost/text style link
  - **Sign Up** — primary button
- Both navigate to `/auth` (existing route). Sign Up can pass a hint (e.g. `/auth?mode=signup`) if `Auth.tsx` supports it; otherwise both go to `/auth`.
- If the user is already authenticated (`useAuth().user`), show a single **Dashboard** button instead.

## Placement & style

- Positioned `absolute top-4 right-4` (with safe spacing on mobile) inside the hero section, `z-20` so it sits above the hero overlay.
- Uses existing semantic tokens / Button variants — no new colors. Log In = `ghost`, Sign Up = `default` (or `hero` for emphasis).
- Responsive: on small screens, slightly tighter padding; both buttons remain visible.

## Files changed

- `src/pages/Index.tsx` — import `useAuth`, add the top-right nav block at the start of the hero section.

No backend, routing, or business-logic changes.