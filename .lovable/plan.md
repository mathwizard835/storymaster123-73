# Fix Gmail Spam Flag on Auth Emails + Supabase Downgrade Check

## Problem 1: Password-reset emails flagged as spam / "dangerous"

**Root cause found (verified via live DNS):** The sender domain `notify.storymaster.app` sends through Mailgun and has an SPF record, but **no DKIM record exists at all** (checked all common selectors: mailo, s1, s2, smtp, k1, pic, mg — all empty). Since Gmail's 2024 sender requirements, mail without DKIM fails DMARC alignment and gets spam-foldered or red-flagged. DMARC is also set to the weakest policy (`p=none`).

### Fix steps
1. **Add the missing DKIM record (user action, ~5 min):**
   - Log into Mailgun dashboard → Sending → Domains → `notify.storymaster.app` → DNS records.
   - Copy the DKIM TXT record Mailgun shows (usually `mailo._domainkey.notify.storymaster.app`).
   - Add it as a TXT record at the DNS provider for storymaster.app (appears to be IONOS, based on the existing SPF record).
   - Click "Verify" in Mailgun once added.
2. **Tighten DMARC** (user action at DNS provider): change `_dmarc.storymaster.app` from `p=none` to `p=quarantine` once DKIM verifies. I'll confirm the exact record value to paste in.
3. **Align the links inside the emails (I can do this in code):** auth emails currently link back to `storymaster123-73.lovable.app` while sending from `storymaster.app`. Mismatched link domains hurt spam scoring. I'll update the auth redirect config to use the custom domain `https://storymaster.app` so sender domain and link domain match.
4. **Verify the fix:** after DNS propagates, I'll send a test password-reset and confirm SPF + DKIM + DMARC all pass in the received email headers ("Show original" in Gmail).

### Why emails were "dangerous" specifically
Gmail shows the red banner when a message fails authentication *and* contains links/buttons. With no DKIM signature and only `p=none` DMARC, every auth email fails alignment — the fix above removes all three causes.

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
- Files touched: `src/lib/authRedirect.ts` (point web auth redirects at `https://storymaster.app`), plus confirmation that Supabase Auth "Site URL" / redirect allow-list includes the custom domain (dashboard setting — I'll flag it if a config change is needed).
- DNS changes are made by the user at IONOS and in the Mailgun dashboard; I'll supply exact record values.
- No changes to story logic, payments, or email templates.
