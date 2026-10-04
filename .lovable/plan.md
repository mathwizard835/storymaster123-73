# Sign-in fixes: step-by-step plan

## Goal
Fix the sign-in and sign-up problems found in the audit. Do the work in three phases, so changes that go live right away aren't held up by the App Store.

## What's broken (confirmed)
1. On the website, a correct sign-in tries to open the iPhone app (`storymasterquest://`) instead of the dashboard. On a computer, the family gets stuck.
2. That app-opening link carries full login tokens, and the iPhone app prints incoming links to its log.
3. Child age and parental consent are never saved. All 90 profiles have none, because the profile save runs before the email is confirmed.
4. The sign-in page runs "already signed in?" and "process email link" at the same time. These can race.
5. The reset-password page doesn't understand newer `?code=` links and can show "Invalid or expired link".
6. Raw technical error messages are shown to families.

## Phase 1: database (live right away, no App Store update)
- Update the account-creation step so it saves child age, parent email, consent and the consent time from the sign-up details.
- Remove the profile update in the app that gets blocked.
- Check: create a test sign-up, confirm the profile row has its age and consent values, then delete the test user.

## Phase 2: website fixes (live once you publish, no App Store update)
Do these in this order, because each builds on the one before:
1. **Website sign-in:** after signing in or signing up, families on the website go straight to the dashboard. Phones get an optional "Open in the app" button. There's no automatic redirect and no tokens in links.
2. **Sign-in page order:** handle an email link first. Only check for an existing session when there's no link.
3. **Reset page:** accept `?code=` links by exchanging the code, or waiting for the recovery event, before deciding a link is invalid.
4. **Friendly errors:** plain messages for wrong password, unconfirmed email, existing account and too many attempts.
- Check: test the browser flows (sign in, sign up with confirm link, forgot password and the reset link) and confirm each one ends on the right page.

## Phase 3: iPhone app (ships with the next App Store version)
- Fixes 2, 4, 5 and 6 above also reach the iPhone app's own copy of the code automatically once rebuilt.
- Stop logging full incoming links in the app's deep-link handling.
- No new iPhone-only behavior. The current app keeps working until then.
- Check: after the next build, test sign-in, the confirm link and the reset link with a sandbox account.

## You need to do
- Publish after Phase 2.
- In Supabase → Authentication → URL Configuration, make sure the Site URL is `https://storymaster.app`. Redirect URLs should include `https://storymaster.app/**` and `storymasterquest://**`.
- Include Phase 3 in your next App Store submission.

## Technical details
- Migration: `CREATE OR REPLACE FUNCTION public.handle_new_user()`, which reads `raw_user_meta_data` with safe casts (`NULLIF`, `::int`, `::boolean`) and falls back to NULL. It sets `parental_consent_method = 'email_verification'` when age < 13. Existing rows stay untouched.
- Files: `src/pages/Auth.tsx` (remove the token handoffs at lines ~91-99, ~337-346 and ~399-408, run the callback before `checkUser`, drop the profile `.update`, map errors), `src/pages/ResetPassword.tsx` (handle `code` and `PASSWORD_RECOVERY`), `src/lib/deepLinkHandler.ts` (redact logs).
- `isNativePlatform()` paths keep their current behavior.
