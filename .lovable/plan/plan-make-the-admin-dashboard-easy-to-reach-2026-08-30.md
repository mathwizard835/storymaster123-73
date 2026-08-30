# Plan: Make the Admin Dashboard Easy to Reach

## Problem

Admin pages (`/admin/analytics` and `/admin/support`) exist but are hard to discover. Right now the only ways in are:

- Typing the URL directly.
- Clicking a small link inside `/admin/analytics` after you already got there.

You also reported that typing `/admin/support` directly returns a 404 even when logged in as an admin. The admin routes are currently wrapped in `NativeAppRoute`, which was designed for native subscription gating; on web this adds an unnecessary dependency on the subscription check and can interfere with direct navigation.

## Goal

Give admin users a clear, reliable way to open the admin dashboard from inside the app, and make the admin routes work correctly on web.

## What we will build

### 1. Add visible admin entry points

- **Dashboard header**: Detect the admin role and show a small "Admin" badge/icon next to the existing LifeBuoy + Settings icons. Tapping it opens a menu or directly navigates to `/admin/analytics`.
- **Settings screen**: Add an "Admin" section (visible only to admins) with links to:
  - System Analytics (`/admin/analytics`)
  - Support Inbox (`/admin/support`)

### 2. Make admin routes web-safe

- Change the route wrappers in `App.tsx` for `/admin/analytics` and `/admin/support` from `NativeAppRoute` to a dedicated `AdminRoute` wrapper.
- `AdminRoute` will:
  - Require authentication (same as `ProtectedRoute`).
  - Skip the native subscription gate (admin access should not depend on an active Adventure Pass).
  - Optionally check the admin role, or leave that to the pages (they already redirect non-admins to `/dashboard`).

### 3. Reuse existing admin check

- Keep the current per-page admin role check in `AdminAnalytics.tsx` and `AdminSupport.tsx` (redirect non-admins to `/dashboard`).
- Optionally extract the check into a small `useAdmin()` hook so the Dashboard header and Settings can reuse it without duplicating the Supabase query.

### 4. Verify direct URL access

- After the route wrapper change, confirm that navigating directly to `/admin/analytics` and `/admin/support` works on both the preview and published URLs when logged in as an admin.

## There are **a few potential issues and security nuances** to keep in mind before implementation:

## 1. Client-Side Access Control & Role Checks (Security)

> **Key Risk:** Security by obscurity on the client side.

- **Client-Side Menu Checks:** Hiding the Admin badge/links using `useAdmin()` only protects the UI, not the data. Make sure the actual data endpoints (e.g., Supabase RLS policies, RPC functions, or backend API routes) strictly enforce admin checks. If non-admins can hit the underlying APIs, hiding the UI won't stop them.
- **Redirection Lag:** If `useAdmin()` relies on an asynchronous query (like checking `user_roles` in Supabase), there might be a brief flicker where non-admins see admin UI elements or where admins get redirected before the check completes. Ensure your `useAdmin()` hook handles a `loading` state cleanly before making redirect decisions.

## 2. Decoupling Admin Access from Subscriptions

> **Good Move, but Watch Edge Cases.**

- **Is** `AdminRoute` **really just** `ProtectedRoute` **+ Admin check?** Moving away from `NativeAppRoute` is correct because admins shouldn't need an active subscription gate to manage the platform.
- **Recommendation:** Instead of having `AdminRoute` delegate the admin check purely to the page components, have `AdminRoute` perform the admin check directly. Otherwise, a non-admin navigating directly to `/admin/support` might briefly render the support page layout before the page-level check kicks in and redirects them.

## 3. Resolving the 404 Issue on Web

> **Verification Step Needed.**

- **Web Routing vs. SPA Routing:** If typing `/admin/support` directly into the browser URL bar returns a 404 on web (especially in production/hosting environments like Vercel, Netlify, or AWS S3/CloudFront), the issue might not *only* be `NativeAppRoute`.
- **Check your web server fallback:** Ensure your web hosting is configured to rewrite all deep paths to `index.html` (Single Page Application fallback). If deep linking isn't configured at the web server layer, direct navigation will continue to throw 404s regardless of React Router changes.

## Summary Checklist


|                                 |                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Issue / Risk**                | **What to double-check**                                                                                           |
| **Data Security**               | Verify that Row Level Security (RLS) on Supabase prevents non-admins from querying admin tables.                   |
| **404 Routing**                 | Ensure SPA fallback rules (e.g., `_redirects` or `vercel.json`) are set up for deep linking.                       |
| **UI Flicker**                  | Handle `isLoading` state inside `useAdmin()` to prevent flickering UI or premature redirects.                      |
| `AdminRoute` **Responsibility** | Enforce the role check inside `AdminRoute` rather than rendering the page first and relying on per-page redirects. |


## Files to change

- `src/App.tsx` — replace `NativeAppRoute` with a new `AdminRoute` for `/admin/analytics` and `/admin/support`.
- `src/pages/Dashboard.tsx` — add an admin entry point in the header when the user is an admin.
- `src/pages/Settings.tsx` — add an Admin section with links to analytics and support (admin-only).
- `src/hooks/useAdmin.tsx` (new, optional) — reusable admin role check.

## Out of scope

- No changes to RLS, `user_roles` table, or admin permissions.
- No changes to the admin pages themselves beyond making them reachable.