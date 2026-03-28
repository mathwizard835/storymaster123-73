# Addressing Apple App Store Rejection

The rejection cites four issues. Here's what needs to happen for each:

---

---

## Issue 2: Guideline 2.3.6 — Age Rating Metadata

**Problem**: You selected "Parental Controls" or "Age Assurance" in the Age Rating but Apple couldn't find them.

**Action**: This is an **App Store Connect config change only** — no code changes. Go to **App Store Connect → App Information → Age Rating** and set both "Parental Controls" and "Age Assurance" to **"None"**.

---

## Issue 3: Guideline 2.1 — Demo Account

**Problem**: The demo credentials don't work.

**Action**: **App Store Connect config change only**. Create a working demo account in your Supabase project and update the credentials in App Store Connect. Make sure the account is verified and can access all features.

---

## Issue 4: Guideline 4.2 — Minimum Functionality (Web View)

**Problem**: Apple says the app feels like a website in a wrapper, not a native app.

This is the most critical rejection reason. The app currently runs as a Capacitor web view with minimal native integration. To pass review, the app needs to feel distinctly native.

**Code changes needed:**

1. **Add native navigation patterns** — Replace web-style navigation with native-feeling transitions. Add swipe-back gesture support and smoother page transitions using Capacitor Motion or CSS animations that mimic iOS transitions.
2. **Implement push notifications** — Add `@capacitor/push-notifications` to send reading reminders and streak notifications. This is a native-only feature Apple specifically mentioned.
3. **Add haptic feedback throughout the UI** — Currently exists in `mobileFeatures.ts` but is only used in test panel. Wire it into story choices, button presses, achievements, and navigation across the app.
4. **Leverage native storage** — The `mobileStorage.ts` already uses `@capacitor/preferences`. Make sure offline story reading works properly and highlight it.
5. **Add App Store native IAP** — RevenueCat is already configured. Ensure the subscription flow uses native StoreKit on iOS instead of Stripe web checkout.
6. **Add iOS-native splash/launch experience** — Improve the launch screen beyond the basic storyboard.
7. **Remove web-browser-like elements on native** — Hide any browser-like UI (URL-style breadcrumbs, external link buttons) when running natively. Ensure all navigation feels app-like.

---

## Recommended Implementation Order

1. Rename "StoryMaster Kids" → "StoryMaster" everywhere (solves Issue 1)
2. Wire haptic feedback into all interactive elements (quick win for Issue 4)
3. Add push notifications with `@capacitor/push-notifications` (key for Issue 4)
4. Add native page transition animations (helps Issue 4)
5. Ensure native IAP flow works end-to-end on iOS (helps Issue 4)
6. Fix demo account + age rating in App Store Connect (Issues 2 & 3)

### Technical notes

- Push notifications require an APNs key uploaded to Apple Developer portal
- The `@capacitor/push-notifications` plugin needs to be added to `package.json` and `npx cap sync ios` run
- Page transitions can use Framer Motion or CSS animations triggered on route changes
- Haptic feedback calls already exist — they just need to be called from UI components