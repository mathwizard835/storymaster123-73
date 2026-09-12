# Fix Password Reset: Spam Flag, Default Template, and the Link That Just Logs You In

The Gmail screenshot changed the diagnosis. Two problems are now confirmed, and they share one root cause area — the branded email system we built is not actually being used.

## What is actually happening

**Confirmed by the email-domain check:** this project runs on your own Supabase instance, so Lovable reports *"Auth emails not managed — Not a managed Supabase project."* Lovable's `auth-email-hook` (with the six branded templates) is **not wired into your Supabase auth**.

**Confirmed by your Gmail screenshot:** the email you received is Supabase's stock template — plain "Follow this link to reset the password for your user" with a bare link, no StoryMaster branding. That is what a default template looks like. The `From` reads `StoryMaster <noreply@storymaster.app>` because custom SMTP is set in the Supabase dashboard, but the *template* and the *sending path* are Supabase's own.

So the `SENDER_DOMAIN` change we deployed to `auth-email-hook` had no effect on this email — that function is never called.

This also explains the spam flag better than DNS alone: a bare, unbranded, link-only message from a domain with weak DMARC (`p=none`) is close to a textbook phishing signature.

**Second problem — the link logs you in instead of asking for a new password.** The app is not at fault: `src/pages/ResetPassword.tsx` correctly reads the recovery token and shows a "Set New Password" form, and `/reset-password` is correctly a public route. The likely cause is that the `redirectTo` value the app sends (`https://storymaster.app/reset-password`) is **not in Supabase's redirect allow-list**. When a redirect target is not allow-listed, Supabase silently falls back to the Site URL — so you land on `/` with a valid session, i.e. logged in, never seeing the form. This is the most probable cause given the evidence; Step 1 confirms it before we change anything else.

## Step 1 — Fix the redirect allow-list (you, 2 min — do this first)

In **Supabase Dashboard → Authentication → URL Configuration**:

1. Set **Site URL** to `https://storymaster.app`
2. Add these to **Redirect URLs**:
   - `https://storymaster.app/**`
   - `https://storymaster123-73.lovable.app/**`
   - `storymasterquest://**`
3. Save, then request a new reset email and click the link.

If you now land on the "Set New Password" form, the diagnosis is confirmed and the second problem is fixed. If you still get logged straight in, tell me and I will trace the actual redirect chain before proposing anything further.

## Step 2 — Decide how branded auth emails should be sent

Because your Supabase is self-managed, there are two realistic routes. This is the one decision I need from you:

**Option A — Point Supabase at the branded templates (recommended).**
Configure Supabase's "Send Email" auth hook to call the deployed `auth-email-hook` function. Supabase then stops using its stock templates and every auth email becomes the branded StoryMaster design already sitting in `supabase/functions/_shared/email-templates/`. This is dashboard configuration plus verification on my side; no new code.

**Option B — Edit Supabase's built-in templates.**
Paste branded HTML directly into Supabase Dashboard → Authentication → Email Templates. Simpler and no hook involved, but the templates then live in the dashboard instead of in your codebase, and the six templates must be maintained by hand.

Either option removes the bare-link phishing signature, which is the largest single contributor to the spam classification.

## Step 3 — DMARC hardening (the IONOS warning)

Only worth doing after Steps 1 and 2, and only if mail still lands in spam.

IONOS groups four records into a managed "Lovable" service, all verified live:

| Type | Host | Value |
|------|------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=none; pct=100; rua=mailto:dmarcreports@lovable.dev` |
| NS | `notify` | `ns3.lovable.cloud` |
| NS | `notify` | `ns4.lovable.cloud` |
| TXT | `_lovable-email` | `lovable_email_verify=5748e51f525ab9399ecff34be95d0711c5fa5c405c913b48ab44d1cb3221becb` |

Editing `_dmarc` makes IONOS offer to disable the whole service — including the `notify` nameserver delegation. **Do not confirm that dialog casually.** If you proceed, immediately re-add the other three records by hand using the exact values above.

Given that the branded-template fix is likely sufficient, my recommendation is to **leave DMARC at `p=none` for now** and revisit only if spam persists. Tightening DMARC while the underlying content problem is unfixed will not help.

## Step 4 — Verify (me)

1. You send one test reset email after Steps 1 and 2.
2. Confirm it renders branded, lands in the inbox, and the red banner is gone.
3. Confirm the link opens the "Set New Password" form rather than logging you in.
4. In Gmail → Show original, confirm SPF, DKIM, and DMARC all show PASS.

## Also worth knowing

The "Forgot password?" link on the published site is only visible on the **Log In** tab; the page opens on Sign Up, which is why it looked unavailable. Direct link: `https://storymaster.app/auth?mode=login` (verified live). I can surface it more prominently as a small separate change if you want.

## Technical details

- No code changes proposed. `src/pages/ResetPassword.tsx` and `src/lib/authRedirect.ts` are already correct; the gaps are in Supabase dashboard configuration.
- `auth-email-hook` and the six templates are deployed and ready — Option A simply connects them.
- Root SPF is `v=spf1 include:_spf-us.ionos.com ~all`; DKIM for `storymaster.app` exists at `resend._domainkey.storymaster.app`. Support-reply emails go through Resend directly and are unaffected by all of this.
