## Hide bottom navigation on paywall

### Problem

Users on the paywall (`/subscription`) see bottom navigation buttons, which is confusing.

### Changes

`**src/components/layout/MobileBottomNav.tsx**`

1. Keep `/subscription` in `hiddenPaths` (already there).
2. Switch from `startsWith` to exact path matching for the paywall so there's no edge-case leakage:
  ```tsx
   const hiddenPaths = ['/mission', '/profile', '/auth', '/reset-password'];
   if (hiddenPaths.some(path => location.pathname.startsWith(path))) return null;
   if (location.pathname === '/subscription' || location.pathname === '/subscription/success') return null;
  ```
3. Remove the **"Pass"** (Crown) item from `navItems` entirely. It is confusing for paying users to see a subscription button in their main navigation, and non-paying users on native are hard-gated to the paywall anyway. Subscription management stays accessible via **Settings → Premium**.

**Result**

- Bottom nav is definitively hidden on the paywall and subscription-success page.
- Paying users no longer see a confusing "Pass" tab in their daily navigation.
- Cleaner 4-item nav: Home, Gallery, Trophies, Parents.