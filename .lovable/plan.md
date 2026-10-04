# Sign-in and account audit: findings and fixes

## What I found (checked in code and live data)

1. **Signing in on the website always tries to open the iPhone app.** After a correct password on the website, the page jumps to `storymasterquest://auth?...` instead of the dashboard. On a computer, or a phone without the app, nothing happens and the family seems stuck. The same thing happens when a signed-in person opens the sign-in page, or after a sign-up that signs them straight in. (`Auth.tsx` lines 91-99, 337-346, 399-408)
2. **Login tokens get put into the link.** That app-opening link includes the full access and refresh tokens. These can end up in browser history, and the deep-link handler prints the whole link to the console. (`deepLinkHandler.ts` line 29)
3. **Child age and parental consent are never saved.** All 90 profiles have no child age, and none of the last 12 sign-ups do either. Email confirmation is required, so right after sign-up there is no session yet and the profile save is blocked. The account-creation step in the database only saves the email and display name. This is a COPPA record-keeping gap.
4. **Confirmation links run twice at the same time.** On the sign-in page, "already signed in?" and "process the email link" start together. They can race, causing double redirects or a wrong "link expired" error.
5. **Reset-password page can bounce valid users.** If the reset code arrives as `?code=` (the newer link format), the page finds no token. It may check for a session before one exists, then send the user to sign-in with "Invalid or expired link".
6. **Smaller issues**
   - If the ban check fails, it lets the person through. This is acceptable, but nothing records it.
   - Raw Supabase error messages are shown to users on sign-up and sign-in.
   - The "Forgot password" success message is fine, but it doesn't say the email may land in spam.

Checked and fine: route protection, the admin role check (roles kept in their own table with correct access rules), profile access rules, sign-out cleanup, the recovery redirect safety net, and RevenueCat identify guards.

## Fixes

1. **Website sign-in goes to the website dashboard.** Only offer "Open in the app" as an optional button on phones (no automatic redirect, no tokens in the link). The app's own email links keep working through the existing deep-link handling.
2. **Remove tokens from links and logs.** The handoff from browser to app uses only Supabase's one-time code or token hash, never raw tokens. Stop logging full URLs.
3. **Save age and consent reliably.** Update the account-creation database step to copy `child_age`, `parent_email`, `parental_consent_given` and the consent time from the sign-up details into the profile. Remove the client-side profile update that gets blocked.
4. **Sequence the sign-in page.** Handle an email link first. Only check for an existing session when there is no link.
5. **Reset page handles `?code=`.** Exchange the code for a session (or wait for the recovery event) before deciding the link is invalid.
6. **Friendlier error messages** for the common sign-up and sign-in failures.

## Technical details
- Files: `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx`, `src/lib/deepLinkHandler.ts`.
- Migration: `CREATE OR REPLACE FUNCTION public.handle_new_user()` inserts the consent fields from `raw_user_meta_data`, with safe casts and NULL fallbacks. Existing profiles stay unchanged (the past values were never captured).
- Native behavior on iOS doesn't change: `isNativePlatform()` paths stay as they are.

## You still need to check in Supabase
- Authentication → URL Configuration includes `https://storymaster.app/**` and `storymasterquest://**`.
