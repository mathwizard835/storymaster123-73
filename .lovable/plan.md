# Safely Update DMARC Without Breaking Lovable Email

## What the IONOS warning actually means

IONOS groups four records into a managed "Lovable" service:

| Type | Host | Value | Purpose |
|------|------|-------|---------|
| TXT | `_dmarc` | `v=DMARC1; p=none; pct=100; rua=mailto:dmarcreports@lovable.dev` | DMARC policy (currently weak `p=none`) |
| NS | `notify` | `ns3.lovable.cloud` | Delegation that lets Lovable send your auth emails |
| NS | `notify` | `ns4.lovable.cloud` | Same |
| TXT | `_lovable-email` | `lovable_email_verify=5748e51f525ab9399ecff34be95d0711c5fa5c405c913b48ab44d1cb3221becb` | Domain ownership verification |

Editing `_dmarc` conflicts with the service definition, so IONOS offers to **disable the whole service**. Confirming blindly would remove the `notify` delegation — the mechanism Lovable uses to send your password-reset/signup emails. That risk is why we do this in a controlled order.

All four values above are verified against live DNS, so we can recreate anything that gets disabled.

## Step 1 — Verify alignment BEFORE touching DMARC (you + me)

Do not change the DMARC policy yet. First we prove the sender-domain fix works:

1. Request a password-reset email to a Gmail address. On the published site, go directly to **https://storymaster.app/auth?mode=login** — the "Forgot password?" link only appears on the Log In tab, and the page opens on Sign Up, which is why it looked unavailable. (Verified live: the link is present and working there.) Triggering it from the mobile app works equally well for this test.
2. In Gmail, open the email → three-dot menu → **Show original**.
3. Send me a screenshot or copy the lines for `SPF:`, `DKIM:`, `DMARC:`.
4. If all three show **PASS**, the fix is working and tightening DMARC is safe. If DKIM or DMARC shows FAIL, we stop here and fix that first — tightening DMARC while failing alignment would make spam flagging *worse*.

### Optional follow-up (not required for the email fix)

The "Forgot password?" link being hidden behind the Log In tab is a discoverability papercut. If you want, I can surface it on the Sign Up tab too, or link it from the landing page. Say the word and I'll add it as a separate small change.


## Step 2 — Apply the DMARC change and restore the service records (you, ~5 min in IONOS)

Only after Step 1 passes:

1. Confirm the IONOS dialog (the service will be disabled — expected).
2. Save the new `_dmarc` TXT record:
   - Host: `_dmarc`
   - Value: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarcreports@lovable.dev`
   - TTL: 30 minutes (fine)
3. **Immediately re-add the three other records manually** (same screen → Add record):
   - NS record, host `notify`, value `ns3.lovable.cloud`
   - NS record, host `notify`, value `ns4.lovable.cloud`
   - TXT record, host `_lovable-email`, value `lovable_email_verify=5748e51f525ab9399ecff34be95d0711c5fa5c405c913b48ab44d1cb3221becb`

The email-sending outage window is only the few minutes between disable and re-add (plus short propagation).

## Step 3 — Verify (me)

After you confirm the records are re-added, I will:

1. Re-check live DNS: `_dmarc` shows `p=quarantine`, both `notify` NS records present, `_lovable-email` TXT intact.
2. Check the project's email-domain health status via Lovable's tooling to confirm the delegation still verifies.
3. Have you send one more password-reset email and confirm it arrives in the Gmail inbox (not spam) with the red warning gone.

## Fallback

If re-adding the NS records in IONOS proves impossible (some registrars refuse NS records on subdomains that conflict with service entries), we revert `_dmarc` to `p=none` and keep the status quo: once Step 1 confirms SPF/DKIM/DMARC alignment passes, `p=none` is usually already enough to remove Gmail's "dangerous" banner — `p=quarantine` is hardening, not a requirement.

## Technical details

- No code changes in this plan. All work is DNS in IONOS plus verification.
- Current root SPF (`v=spf1 include:_spf-us.ionos.com ~all`) does not include the email sender, so DMARC alignment relies on DKIM — which is exactly what Step 1 verifies before we touch anything.
- The Resend DKIM key on `resend._domainkey.storymaster.app` is live and unchanged; support-reply emails are unaffected by all of this.
