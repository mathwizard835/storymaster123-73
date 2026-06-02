# Mobile UI Bug Fixes

After scanning the mobile app screens, here are the issues worth fixing. Grouped by severity — Lows are skipped unless you want a full sweep.

## High-severity (visible breakage)

1. **Settings.tsx L220** — `<Separator className="ml-15" />` uses an invalid Tailwind class (no `ml-15` in v3). Separator renders full-width, breaking list alignment. → change to `ml-14`.
2. **Mission.tsx L993 + L1052** — `if (!profile) return <div .../>` and `if (!scene) return null` render a completely blank screen with no spinner, message, or recovery. → add a loading skeleton / "Something went wrong, return to dashboard" fallback.
3. **Subscription.tsx L249** — Back button uses `text-foreground` on a dark purple gradient. In light mode `foreground` is near-black, making the button invisible. → use `text-white` (or `text-primary-foreground`).
4. **Dashboard.tsx L270–292** — "Continue your adventure" hero button: the title container next to the fixed `h-14 w-14` icon has no `min-w-0`/`truncate`, so long story titles push the play icon off-screen. → add `min-w-0` to the wrapper and `truncate` to the title.
5. **SubscriptionModal.tsx L74** — `scale-[1.02]` on the premium card combined with the dialog's overflow can bleed the card outside the dialog on 320–375px viewports. → remove the scale or add `overflow-hidden` to the card.

## Medium-severity (layout / theming)

6. **NativeWelcome.tsx L36** — `<div className="flex-shrink-0 h-8" />` is a hard-coded 32px top spacer; iPhones with 59px Dynamic Island overlap the logo. → replace with `style={{ paddingTop: 'env(safe-area-inset-top, 32px)' }}`.
7. **Subscription.tsx L237** — Gradient starts with `from-primary`, which is light in light mode; the white text on it loses contrast on tablets/web. → use `from-purple-900` unconditionally (or scope with `dark:`).
8. **Subscription.tsx L397** — `text-5xl md:text-6xl` headline has no overflow guard. → add `leading-tight break-words`.
9. **StoryGallery.tsx L128** — `<main>` lacks `overflow-x-hidden`; flex-wrap badge rows can horizontally overflow at 320px. → add `overflow-x-hidden`.
10. **Mission.tsx L1060** — Bottom safe-area inset is applied to the outer wrapper instead of the scroll container, so it's hidden behind the fixed footer. → move `paddingBottom` onto the scrollable content area.
11. **SubscriptionModal.tsx L172** — Logic shows "Current Plan" on the free tier even when `currentPlan` is null, making logged-out/free users think they're already subscribed. → `!currentPlan && plan.price_monthly === 0 ? 'Current (Free)' : ...`.
12. **Settings.tsx L147** — `isPhone && "pb-28"` applies excessive bottom padding on web mobile where the native bottom nav doesn't render. → change to `isPhone && isNative && "pb-28"`.

## Not changing

- Hardcoded `bg-black/40`, `text-white`, etc. inside Mission.tsx — intentional immersive dark theme.
- NativeWelcome raw HSL — intentional branded splash.
- Index-as-key in static onboarding pill arrays — harmless.

## Scope

Frontend/presentation only — no business logic changes, no refactors. Each fix is a small, targeted edit **only to the file noted.**