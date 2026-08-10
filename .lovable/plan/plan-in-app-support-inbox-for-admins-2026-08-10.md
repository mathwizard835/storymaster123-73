# Plan: In-App Support Inbox for Admins

## Goal
Let admins read, triage, and respond to support messages from inside the app instead of running SQL in Supabase.

## What we will build

### 1. Database changes
Add to the existing `support_requests` table:
- `status` — one of New, In progress, Resolved (defaults to New)
- `admin_notes` — internal notes / a record of the reply text sent
- `replied_at` and `updated_at` timestamps

Access rules:
- Anyone can still submit a support request (unchanged).
- Only users with the admin role can view requests or change status/notes.

### 2. New page: Support Inbox (`/admin/support`)
- Admin-only, gated the same way the existing analytics admin page is (checks the admin role, shows an access-denied state otherwise).
- List of requests, newest first, showing: name, email, message preview, date, and a status badge.
- Filter tabs: All / New / In progress / Resolved, with a count of open (New) requests.
- Clicking a request opens a detail panel with the full message plus the auto-captured debug metadata (app version, user ID, device info, page).

### 3. Replying
- A "Reply" button opens the admin's mail app with the recipient, subject (`Re: StoryMaster support`), and the original message quoted underneath.
- A text box next to it lets the admin paste/save what they replied; saving stores it in `admin_notes`, stamps `replied_at`, and moves status to In progress (or Resolved if the admin picks that).
- Status can also be changed directly from the list.

### 4. Entry point
- Add a "Support Inbox" link on the existing admin analytics page, and a route in `App.tsx`. The page is not shown in normal user navigation.

## Technical notes
- New page `src/pages/AdminSupport.tsx`, lazy-loaded, route `/admin/support` behind the same protected route wrapper used by `/admin/analytics`.
- Admin check reuses the `user_roles` + `has_role` pattern already in the project; RLS policies use `public.has_role(auth.uid(), 'admin')` so no data leaks to non-admins.
- Grants: `SELECT, UPDATE` on `support_requests` to `authenticated` (RLS restricts to admins); insert grants stay as-is.
- `updated_at` maintained by the existing `update_updated_at_column()` trigger function.
- No email service added — replies go through the admin's mail client per your choice.
