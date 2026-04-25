Plan: Make the web page just the app landing page

Goal

- Web visitors should see only the StoryMaster Kids landing/marketing page.
- The actual app experience should remain available inside the native mobile app.
- Auth email/deep-link handling should continue to reopen the mobile app instead of dropping users into the web app.

What I will change

1. Update the main router behavior

- Keep `/` as the public landing page on web.
- Keep the current native app flow unchanged: onboarding/welcome/dashboard inside Capacitor.
- Add a web-only guard for app routes like `/dashboard`, `/mission`, `/profile`, `/gallery`, `/achievements`, `/parent-dashboard`, `/settings`, and `/subscription` so direct web visits redirect back to `/` instead of showing the app UI.

2. Clean up landing page actions for web

- Remove/disable web landing page buttons that send users into the app UI or web signup flow.
- Replace the main call-to-action with app-focused copy, such as “Download the App” / “Available on the App Store” style messaging, depending on what app-store link is available in the project.
- Keep “See How It Works” and marketing sections so the web page functions as a standalone landing page.
- MAKE SURE THAT AFTER SIGN IN ON THE APP OR THE WEBSITE IT ALWAYS REDIRECTS YOU TO THE APP, AND YOU ARE AUTOMATICALLY SIGNED IN WITH THE EMAIL AND PASSWORD YOU PROVIDED

3. Preserve native app access

- Ensure native users can still tap Sign Up / Log In and reach `/auth` inside the app.
- Ensure native users can still access dashboard, profile, stories, subscriptions, and settings.
- Keep mobile bottom nav behavior for native app users.

4. Preserve auth callback/deep-link handling

- Keep `/auth` and `/reset-password` available where needed for Supabase email callbacks.
- Make sure callbacks that open in iOS Safari still show/attempt the `storymasterquest://` handoff so users are routed into the native app.
- Avoid redirecting auth callback URLs to the landing page before the app handoff logic can run.

Technical details

- Likely changes will be limited to:
  - `src/App.tsx` for web-vs-native route guarding.
  - `src/pages/Index.tsx` for landing page CTA/link cleanup.
  - Possibly `src/pages/Auth.tsx` only if web auth needs a clearer “Open the app” handoff state.
- I will not refactor unrelated pages.
- I will re-read modified files and run a build/type check after implementation to confirm no syntax errors or broken references.