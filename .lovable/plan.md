

# Integrating Real Apple In-App Purchases

## Overview

To add real IAP for your $6.99 (Adventure Pass) and $7.99 (Adventure Pass Plus) subscriptions on iOS, the recommended approach is **RevenueCat** -- a service that wraps Apple's StoreKit and handles receipt validation, subscription status, and webhooks. This avoids you having to build complex server-side receipt verification yourself.

## Architecture

```text
iOS App (Capacitor)
  |
  v
RevenueCat SDK (@revenuecat/purchases-capacitor)
  |
  v
Apple App Store (StoreKit)
  |
  v
RevenueCat Server (receipt validation)
  |
  v
Supabase Webhook (updates user_subscriptions table)
```

## Steps

### 1. App Store Connect Setup (Manual -- done by you)

- Create your app in [App Store Connect](https://appstoreconnect.apple.com)
- Go to **Subscriptions** and create a Subscription Group (e.g., "Adventure Pass")
- Add two auto-renewable subscription products:
  - **Product ID**: `adventure_pass` -- $6.99/month
  - **Product ID**: `adventure_pass_plus` -- $7.99/month
- Fill in display names, descriptions, and localization

### 2. RevenueCat Setup (Manual -- done by you)

- Create a free account at [revenuecat.com](https://www.revenuecat.com)
- Create a new project and add your iOS app
- Paste your App Store Connect **Shared Secret** and **App Store Connect API Key** into RevenueCat
- In RevenueCat, create:
  - **Products**: Map `adventure_pass` and `adventure_pass_plus`
  - **Entitlements**: Create `premium` and `premium_plus` entitlements
  - **Offerings**: Create a "default" offering with both packages
- Copy your **RevenueCat Public API Key** (starts with `appl_`)

### 3. Install the Capacitor Plugin

- Add `@revenuecat/purchases-capacitor` as a dependency
- This gives you a JS/TS API to interact with StoreKit from your Capacitor app

### 4. Create IAP Service (`src/lib/iapService.ts`)

A new module that:
- Initializes RevenueCat SDK with your public API key on app startup
- Fetches available packages (offerings) to get real prices from Apple
- Handles the purchase flow (calls `Purchases.purchasePackage()`)
- Checks subscription status via `Purchases.getCustomerInfo()`
- Identifies the user with RevenueCat (using Supabase user ID)

### 5. Create Supabase Webhook Edge Function

- Create `supabase/functions/revenuecat-webhook/index.ts`
- RevenueCat sends webhook events (purchase, renewal, cancellation, expiration) to this endpoint
- The webhook updates the `user_subscriptions` table in your database
- This keeps your backend in sync with Apple's subscription state
- Add your RevenueCat webhook secret as a Supabase secret

### 6. Update Subscription Page (`src/pages/Subscription.tsx`)

- On native: fetch real prices from RevenueCat offerings (so Apple-approved prices display correctly for all locales)
- Replace the "Coming Soon" toast with actual `purchasePackage()` calls
- After purchase, verify entitlement and update local state
- Handle purchase errors (cancelled, already owned, etc.)

### 7. Update App Initialization (`src/App.tsx`)

- Initialize RevenueCat SDK on app start (only on native platform)
- Set the user ID when authenticated so purchases are tied to accounts

### 8. Sync with Capacitor

After implementation, you'll need to:
```bash
npm run build && npx cap sync ios && npx cap open ios
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/iapService.ts` | Create | RevenueCat SDK wrapper |
| `supabase/functions/revenuecat-webhook/index.ts` | Create | Webhook to sync subscription status |
| `src/pages/Subscription.tsx` | Modify | Wire up real purchase buttons |
| `src/App.tsx` | Modify | Initialize RevenueCat on startup |
| `supabase/config.toml` | Modify | Add webhook function config |

## What You Need to Do First (Before I Implement)

1. **Create products in App Store Connect** (the two subscription products above)
2. **Create a RevenueCat account** and configure it with your App Store Connect credentials
3. **Get your RevenueCat Public API Key** (the `appl_...` key) -- I'll need this to add to the code
4. **Set up the RevenueCat webhook URL** -- I'll create the edge function first, then you point RevenueCat's webhook to it

Would you like to proceed? Once you have the RevenueCat API key ready, I can implement all the code changes.

