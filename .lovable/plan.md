
# Fix Two Issues: Stripe Subscription & User Invitation

## Issue 1: Subscription Still Failing

### Root Cause Found
The error message shows:
```
No such price: '/v1/prices/price_1Sw4cqRu0lh0G69aHa30gMjC'
```

The price ID has `/v1/prices/` prefixed to it. This means when the secrets were updated, the **URL path was accidentally included** instead of just the bare price ID.

### Current (Wrong) Secret Values
| Secret | Current Value (Wrong) |
|--------|----------------------|
| `STRIPE_PREMIUM_PRICE_ID` | `/v1/prices/price_1Sw4cqRu0lh0G69aHa30gMjC` |
| `STRIPE_PREMIUM_PLUS_PRICE_ID` | `/v1/prices/price_1Sw4dWRu0lh0G69aY4pysSsV` |

### Required Fix
Update both secrets with **just the price ID** (no URL path):

| Secret | Correct Value |
|--------|---------------|
| `STRIPE_PREMIUM_PRICE_ID` | `price_1Sw4cqRu0lh0G69aHa30gMjC` |
| `STRIPE_PREMIUM_PLUS_PRICE_ID` | `price_1Sw4dWRu0lh0G69aY4pysSsV` |

---

## Issue 2: Invited Users Don't Know Their Password

### The Problem
When you invite users through Supabase (using the "Invite User" feature in Authentication > Users), Supabase sends them an invitation email with a link to set their password. However, the **default Supabase invitation email template** may not clearly explain this.

### How Supabase Invitations Work
1. Admin invites user via Supabase Dashboard
2. Supabase sends an email with a magic link
3. User clicks the link and gets redirected to your app
4. User should be prompted to set their password

### The Fix
Your app needs to handle the `invite` callback type. Currently, your Auth page only handles `signup` verification. We need to:

1. **Detect when a user arrives from an invitation link** (URL contains `type=invite`)
2. **Redirect them to the password reset page** so they can set their password
3. **Show a friendly message** explaining they need to create a password

### Code Changes Required

**File: `src/pages/Auth.tsx`**
- Add handling for `type=invite` in the auth callback
- Redirect invited users to `/reset-password` with a helpful message

**File: `src/pages/ResetPassword.tsx`**
- Update the page title/description to also work for invited users
- Show appropriate messaging like "Set your password" vs "Reset your password"

---

## Technical Implementation

### Auth.tsx Changes
Add invite handling in the `handleAuthCallback` function:

```text
- Check for type=invite in URL hash
- If found, redirect to /reset-password?type=invite
- Show toast: "Welcome! Please set your password to complete your account setup."
```

### ResetPassword.tsx Changes
Add conditional messaging:

```text
- If URL has ?type=invite, show "Set Your Password" title
- Otherwise show "Reset Your Password" title
- Update description accordingly
```

---

## Summary

| Issue | Solution |
|-------|----------|
| Subscription failing | Update secrets to remove `/v1/prices/` prefix |
| Invited users no password | Add invite callback handling to redirect to password setup |
