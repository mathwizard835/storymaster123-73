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
- **One-time backfill of existing accounts:** copy age, parent email and consent from each account's sign-up details into its profile.
  - It only fills empty fields and never overwrites existing values.
  - Live data: 65 of the 90 accounts have an age saved, and 38 have consent and a parent email. These get filled.
  - The other 25 accounts signed up before these questions existed. Their fields stay empty, because there is nothing to copy.
- Check: confirm the filled counts match 65 and 38. Then create a test sign-up, confirm its profile has age and consent, and delete the test user.

## Phase 2: website fixes (live once you publish, no App Store update)
Do these in this order, because each builds on the one before:
1. **Website sign-in:** after signing in or signing up, families on the website go straight to the dashboard. Phones get an optional "Open in the app" button. There's no automatic redirect and no tokens in links.
2. **Sign-in page order:** handle an email link first. Only check for an existing session when there's no link.
3. **Reset page:** accept `?code=` links by exchanging the code, or waiting for the recovery event, before deciding a link is invalid.
4. **Friendly errors:** plain messages for wrong password, unconfirmed email, existing account and too many attempts.
5. **Compatibility with the current App Store version:** families on today's iPhone version keep signing in normally until the new version is approved by Apple.
   - Inside the app itself, sign-in is unchanged. The app still runs its own copy of the code.
   - If a confirm or reset link opens in a phone's browser (iPhone or iPad, detected from the browser's identity), the page still offers to open the app with `storymasterquest://`, as it does today. It sends the one-time `token_hash` or `code`, which today's app already accepts, and only passes tokens when the link contains nothing else. If the app doesn't open, the browser finishes the sign-in itself.
   - On computers, and after a plain website sign-in, the page goes straight to the website dashboard.
- Check: test the browser flows (sign in, sign up with confirm link, forgot password and the reset link) and confirm each one ends on the right page. Also test that a confirm link opened in iPhone Safari still opens the current app.

## Phase 3: iPhone app (ships with the next App Store version)
- Fixes 2, 4, 5 and 6 above also reach the iPhone app's own copy of the code automatically once rebuilt.
- Stop logging full incoming links in the app's deep-link handling.
- No new iPhone-only behavior. The current app keeps working until then.
- Check: after the next build, test sign-in, the confirm link and the reset link with a sandbox account.

## You need to do
- Publish after Phase 2.
- **Lock down the redirect list** in Supabase → Authentication → URL Configuration. Set the Site URL to `https://storymaster.app`, remove every `/**` wildcard, and allow only these exact addresses:
  - `https://storymaster.app/auth`
  - `https://storymaster.app/reset-password`
  - `storymasterquest://auth`
  - `storymasterquest://reset-password`
  - The app has no `/auth/callback` page. Confirm links return to `/auth`, so `/auth` is the exact address to allow. Allowing `/auth/callback` instead would break confirm links.
- Include Phase 3 in your next App Store submission.

## Technical details
- Migration: `CREATE OR REPLACE FUNCTION public.handle_new_user()`, which reads `raw_user_meta_data` with safe casts (`NULLIF`, `::int`, `::boolean`) and falls back to NULL. It sets `parental_consent_method = 'email_verification'` when age < 13.
- Backfill (one-time data update): `UPDATE public.profiles p SET child_age = COALESCE(p.child_age, NULLIF(u.raw_user_meta_data->>'child_age','')::int), parent_email = COALESCE(p.parent_email, ...), parental_consent_given = COALESCE(p.parental_consent_given, ...)::boolean FROM auth.users u WHERE p.id = u.id`.
  - `parental_consent_at` comes from `u.email_confirmed_at`, the moment the parent's email confirmed consent.
- Legacy handoff: a `navigator.userAgent` check (`/iPhone|iPad|iPod/`) gates the callback-only handoff in `Auth.tsx`.
- Files: `src/pages/Auth.tsx` (remove the token handoffs at lines ~91-99, ~337-346 and ~399-408, run the callback before `checkUser`, drop the profile `.update`, map errors), `src/pages/ResetPassword.tsx` (handle `code` and `PASSWORD_RECOVERY`), `src/lib/deepLinkHandler.ts` (redact logs).
- `isNativePlatform()` paths keep their current behavior.
