# Plan: Make the Admin Dashboard Easy to Reach

## Problem
Admin pages (`/admin/analytics` and `/admin/support`) exist but are hard to discover. Right now the only ways in are:
- Typing the URL directly.
- Clicking a small link inside `/admin/analytics` after you already got there.

Users also report that typing `/admin/support` directly returns a 404 even when logged in as an admin. The admin routes are currently wrapped in `NativeAppRoute`, which was designed for native subscription gating; on web this adds an unnecessary dependency on the subscription check and can interfere with direct navigation.

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

## Files to change
- `src/App.tsx` — replace `NativeAppRoute` with a new `AdminRoute` for `/admin/analytics` and `/admin/support`.
- `src/pages/Dashboard.tsx` — add an admin entry point in the header when the user is an admin.
- `src/pages/Settings.tsx` — add an Admin section with links to analytics and support (admin-only).
- `src/hooks/useAdmin.tsx` (new, optional) — reusable admin role check.

## Out of scope
- No changes to RLS, `user_roles` table, or admin permissions.
- No changes to the admin pages themselves beyond making them reachable.
