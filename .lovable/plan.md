## Plan

1. Fix the mobile Log In button

- Update the native welcome screen so **Log In** opens `/auth?mode=login` instead of the default signup tab.
- Update the auth screen tabs to read the `mode=login` query parameter and default to the login tab when present.

2. Make parent email the only verification target

- Treat the signup email field as the **parent/guardian account email**, not a child email.
- Remove the second parent-email requirement from the COPPA consent step to avoid collecting two emails and creating the “kid + parent verification” confusion.
- Store that same account email in `profiles.parent_email` for under-13 users.
- Update signup, resend verification, and success/error copy so it says the verification email goes to the parent/guardian email only.
- Keep the existing age gate and parental gate intact.

3. Clean up auth email messaging

- Update the signup confirmation email template wording so it is addressed to the parent/guardian and says confirming activates the child’s StoryMaster Kids account.
- Keep using the verified `notify.storymaster.app` email domain.
- Redeploy the auth email function after template/code changes.

4. Add Google sign up / sign in UI

- Add a **Continue with Google** button to the auth screen for both login and signup.
- Use Supabase OAuth with `provider: 'google'` and the existing redirect/deep-link helper so native returns to the app.
- After OAuth sign-in, route users through the existing native hard paywall like email/password users.

5. Google provider setup note

- The code can be added now, but Google OAuth will only work after the Google provider is enabled in your external Supabase dashboard with the Google Client ID/secret and redirect URL.
- I’ll include the exact Supabase dashboard link after implementation.

6. Verification

- Re-read all changed files completely.
- Check for undefined references, unused code, and syntax issues, conduct a comprehensive check for bugs.
- Validate the flow logic: tutorial → auth, Log In opens login tab, signup verifies only parent account email, and authenticated mobile users hit the paywall. Make this validation comprehensive and deep.