# Fix: paywall reappears right after paying (iOS)

## What's happening
After Apple confirms the payment, the app sends the family back to the paywall. Signing out and in "fixes" it only because that clears a stale saved answer and gives the payment confirmation time to arrive.

Three causes work together:
1. **Stale "not subscribed" answer.** The app remembers the subscription check for 30 seconds. The paywall check just before purchase saved "not subscribed", and the re-check right after purchase reuses that old answer.
2. **The app can't record the purchase itself.** After a security fix, only the server (the RevenueCat notification) may write subscriptions. The app's own "activate now" write is silently rejected, but the app carries on as if it worked.
3. **Checking too soon.** The app sends the user to the dashboard at once. Apple/RevenueCat's confirmation usually arrives 2–10 seconds later, so the gate finds nothing and shows the paywall.

## The fix
- After a successful purchase or restore, **clear the saved answer** before checking again.
- Show a short **"Activating your Adventure Pass…"** screen. It checks again every few seconds for up to about 30 seconds. When the subscription appears, it opens the dashboard, with no paywall bounce.
- **Grace period:** if Apple/RevenueCat confirms the purchase on the phone, let the user in right away and remember it for 10 minutes. Meanwhile, the server confirmation arrives in the background, so a slow notification won't paywall a paying user.
- If nothing arrives after 30 seconds, show a friendly "Still confirming — tap Restore Purchases" message instead of dropping them on the paywall.
- Stop treating the rejected "activate now" write as a success. It stays harmless, and we log the failure.

No change to prices, the paywall for non-payers, or security rules.

## Technical details
- `src/pages/Subscription.tsx` (IAP purchase + restore handlers): call `invalidateSubscriptionCache()` first. Then call `pollForSubscriptionUpdate` (from `nativePayments.ts`, backoff capped at ~30s total) while a loading state is shown. Navigate only on success. On timeout, show a toast with a restore hint.
- `src/App.tsx` `RequireSubscription`: before paywalling, accept a short-lived local entitlement flag `sm_iap_grace_<userId>` (10 min), written when `purchasePackage` or `restorePurchases` returns an active `premium` entitlement from RevenueCat `customerInfo`. Invalidate the subscription cache inside the `subscription-refreshed` handler before `runCheck`.
- `src/lib/iapService.ts`: `activateSubscriptionAfterPurchase` returns false and warns when the insert is rejected by RLS. Add a `setIapGrace(userId)` helper.
- Server side is unchanged: `revenuecat-webhook` already writes the active row (logs show `INITIAL_PURCHASE applied`).

## Verify
- Buy with a sandbox account: you should see "Activating…" and then the dashboard, with no paywall bounce and no re-login.
- Restore Purchases should behave the same way.
- A non-subscriber should still see the paywall.
