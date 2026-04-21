## Scope

Fix only Issue 1 (confirmation emails not being sent) and add an "Pay with Apple" button below the existing Stripe button on the Subscription page.

## Issue 1 — Confirmation emails

**Root cause confirmed via DB:** Today's signup `mihirmantri@gmail.com` has `confirmation_sent_at = NULL` and `email_confirmed_at` auto-populated seconds after signup → email autoconfirm is ON at the Supabase project level, so Supabase never even attempts to send a confirmation email.

**Fix plan:**

1. Re-enable email confirmation at the Supabase project level (turn autoconfirm OFF). Once off, Supabase will populate `confirmation_sent_at` and route the email through the standard pipeline.
2. Set up branded auth email infrastructure so the confirmation email is sent from `notify.storymaster.app` with StoryMaster Kids branding (purple/pink gradient, kid-friendly copy) instead of the default unstyled Supabase template.
3. Scaffold all 6 auth email templates (signup, magic-link, recovery, invite, email-change, reauthentication), apply brand styling (white body, purple primary `#7c3aed`-ish accents matching the app's gradient theme), then deploy `auth-email-hook`.
4. Update `mem://auth/email-verification-disabled` → replace with a rule stating verification IS required and emails are branded.
5. Update post-signup toast copy in `src/pages/Auth.tsx` so users always see "Check your email to confirm your account" (the current branch logic already shows this when `data.user && !data.session`, which will now always fire).

## Add "Pay with Apple" button (web Subscription page)

Currently in `src/pages/Subscription.tsx`, the **web** branch (`!isNativePlatform()`) shows only the Stripe "Start Your Adventure" button. Add a secondary "Pay with Apple" button **below** it.

**Behavior:** Since Apple IAP is a native-iOS-only mechanism (RevenueCat SDK), tapping "Pay with Apple" on the web cannot actually open the App Store IAP flow. The realistic options are:

- (a) Show a toast/dialog explaining Apple Pay requires the iOS app, with a link to the App Store, OR
- (b) Trigger Stripe Checkout's Apple Pay payment method (Stripe supports Apple Pay as a wallet on Safari/iOS web).

I'll go with **(b)** — it actually works on the web and is the user's stated intent. The existing `create-checkout-session` already configures Stripe Checkout, which automatically surfaces Apple Pay when the browser supports it. The new button calls the same edge function but passes a flag (`paymentMethodPreference: 'apple_pay'`) so the edge function restricts `payment_method_types` to `['card']` with `payment_method_options.card.request_three_d_secure: 'automatic'` and Apple Pay is auto-enabled by Stripe when domain is verified.

Simpler approach that requires no edge function change: the new button just invokes the same `handleSubscribe` flow (Stripe auto-shows Apple Pay on supported devices). The button is purely a visual affordance signaling "Apple Pay is supported here" — same parental gate, same flow.

**Implementation:**

- In `src/pages/Subscription.tsx`, inside the web (non-native) branch, directly below the existing "Start Your Adventure" Stripe button, add a second button: black background, Apple logo (SVG inline), text "Pay with Apple", calls the same `requireParentalGate(handleSubscribe)`.
- No edge function changes.

## Files Modified

- **NEW** `supabase/functions/auth-email-hook/index.ts` (auto-scaffolded)
- **NEW** `supabase/functions/_shared/email-templates/*.tsx` (6 branded templates, scaffolded then styled)
- `src/pages/Auth.tsx` — adjust post-signup toast copy
- `src/pages/Subscription.tsx` — add "Pay with Apple" button below Stripe button (web branch only)
- Supabase Auth config — disable autoconfirm (re-enable email confirmation)
- `mem://auth/email-verification-disabled` → updated to reflect verification IS now required

## Result

- New signups receive a branded StoryMaster Kids confirmation email from `notify.storymaster.app`; `confirmation_sent_at` populates and `email_confirmed_at` stays NULL until the user clicks the link.
- Web Subscription page shows a second "Pay with Apple" button below the Stripe CTA, gated by the parental gate, opening the same Stripe Checkout (which surfaces Apple Pay natively on supported browsers).
- No changes to native iOS payment flow, no changes to Stripe webhook, no changes to RevenueCat.

In addition to All of this: Make Grown Up Check easier and less complex