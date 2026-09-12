# Fix Gmail Spam Flag on Auth Emails + Supabase Downgrade Check

## Deployment note (answered before implementation)
No Xcode build or App Store release is required. The spam fix is DNS + one edge-function constant change. The only web-frontend change is updating the auth redirect URL, which requires a normal Lovable **Publish → Update**; native iOS auth continues using the unchanged `storymasterquest://` scheme.


## Problem 1: Password-reset emails flagged as spam / "dangerous"

### What is actually happening
Auth emails are sent by `supabase/functions/auth-email-hook` with:
- **Visible `From`:** `StoryMaster <noreply@storymaster.app>`
- **Envelope sender domain:** `notify.storymaster.app`

`storymaster.app` has a Resend DKIM record (`resend._domainkey.storymaster.app`) and DMARC, but `notify.storymaster.app` is a Lovable-delegated subdomain that currently only has a Mailgun SPF record and **no DKIM record at all**. Gmail sees mail coming from `notify.storymaster.app` while the From header claims `storymaster.app`; the two domains do not authenticate together, so the message fails alignment and is flagged as spam / "dangerous".

Support replies are already sent directly through Resend (`send-support-reply`), but auth emails are not — yet.

### Fix steps
1. **Switch auth email sending to the Resend-verified root domain (code change I can deploy):**
   - In `supabase/functions/auth-email-hook/index.ts`, change `SENDER_DOMAIN` from `"notify.storymaster.app"` to `"storymaster.app"` so the envelope sender matches the `From` domain.
   - This makes auth emails use the same verified `storymaster.app` domain that already has Resend DKIM.
2. **Verify `storymaster.app` is active in Resend (user action, ~2 min):**
   - Open Resend dashboard → Domains.
   - Confirm `storymaster.app` is verified and has the DKIM TXT record `resend._domainkey.storymaster.app`.
   - If it is not verified, add the record Resend provides and verify it.
3. **Tighten DMARC** (user action at DNS provider): keep `_dmarc.storymaster.app` but change policy from `p=none` to `p=quarantine` once auth emails are confirmed aligned.
4. **Align the links inside the emails (code change I can deploy):** auth email templates currently link back to `storymaster123-73.lovable.app`. Mismatched link domains hurt spam scoring. Update `src/lib/authRedirect.ts` so web auth redirects use `https://storymaster.app`.
5. **Verify the fix:** after DNS propagates, send a test password-reset and confirm SPF + DKIM + DMARC all pass in the received email headers ("Show original" in Gmail).

### Why emails were "dangerous" specifically
Gmail shows the red banner when a message fails authentication *and* contains links/buttons. With the envelope sender (`notify.storymaster.app`) lacking DKIM and the visible From domain (`storymaster.app`) only weakly protected by `p=none` DMARC, every auth email fails alignment. Matching the sender domain to the From domain removes the mismatch.


## Problem 2: Downgrading Supabase Pro → Free

**Verified so far:** database size is **20 MB** — far under the 500 MB free limit. That quota is safe.

**What I could not check from here** (needs a 1-minute look at Supabase Dashboard → Project → Usage, or tell me the numbers):
- Monthly egress (free tier allowance is much smaller than Pro; the project hit an egress quota alert before, so this is the one to watch — the caching/heartbeat optimizations we added reduced it, but confirm the current month is comfortably under the free limit)
- Monthly active auth users (free: 50k — almost certainly fine)
- Edge function invocations (free: 500k/month)

**What you lose on Free, even if quotas fit:**
- No daily backups (Pro keeps 7 days). For a paid-subscriber production app this is the biggest risk.
- Free projects pause after ~7 days of inactivity (unlikely to matter for a live app).
- Slower shared compute.

**Verdict:** downgrading will not delete or break the project — worst case is feature loss (backups) or throttling if egress exceeds the free allowance again. Safe path: check the Usage page first; if egress is near the free cap, stay on Pro or reduce audio/story payload egress further before switching.


## Technical details
- Files touched: `supabase/functions/auth-email-hook/index.ts` (change `SENDER_DOMAIN` to `storymaster.app`) and `src/lib/authRedirect.ts` (point web auth redirects at `https://storymaster.app`).
- DNS changes are made by the user at IONOS and in the Resend dashboard; I'll supply exact record values.
- No changes to story logic, payments, or email templates.
