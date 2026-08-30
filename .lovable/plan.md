# Send support replies from inside the admin panel

## What's happening today

The admin support panel never sends any email. The "Reply" button just opens your device's default mail app with a pre-filled draft (a `mailto:` link). If your Mac/phone has no mail client configured, or you're on a browser where `mailto:` is blocked, nothing happens at all — and even when it does open, the message is only sent if you press Send inside that mail app. The "Save"/"Mark resolved" buttons only write internal notes to the database; they email nobody.

So: replies are not being sent, and that's by design of the current build, not a bug in delivery.

## What to build

Real in-app sending, using the same email pipeline that already delivers StoryMaster's verified auth emails from `storymaster.app`.

1. **New edge function `send-support-reply`**
   - Admin-only: verifies the caller's JWT and that they have the `admin` role.
   - Loads the support request, sends the reply to the requester's email via the existing `enqueue_email` queue (same mechanism as auth emails), from `StoryMaster Support <support@storymaster.app>` with `Reply-To` set to your support address.
   - Simple branded HTML template (logo/header, the admin's message, quoted original request).
   - On success, updates the request: `status = in_progress` (or `resolved` if the admin chose that), `replied_at = now()`.

2. **Reply history**
   - New table `support_replies` (request_id, admin_id, body, sent_at, delivery status) so the panel shows the full thread instead of a one-off note field. Admin-only RLS + grants.

3. **Admin UI (`src/pages/AdminSupport.tsx`)**
   - Replace the `mailto:` button with a "Reply" composer: textarea, "Send reply" and "Send & mark resolved".
   - Shows sending state, success/failure toast, and the list of previously sent replies with timestamps.
   - Keep internal `admin_notes` as a separate, non-emailed field.
   - Keep a small "Open in mail app" fallback link for edge cases.

4. **Verification**
   - Send a test reply to your own address from the panel and confirm arrival plus the row in `email_send_log`.
   - Check the function logs if delivery stalls.

## Technical notes

- Sending path: `supabase.rpc('enqueue_email', { queue_name: 'support_emails', payload: {...} })`, mirroring `supabase/functions/auth-email-hook/index.ts`. No new API key or third-party provider needed — DNS for `storymaster.app` is already set up.
- Function uses `SUPABASE_SERVICE_ROLE_KEY` internally; the client calls it with the anon key + user JWT.
- `verify_jwt` stays on; role check via the existing `has_role(auth.uid(), 'admin')` function.
- Plain-text alternative generated alongside the HTML for deliverability.
