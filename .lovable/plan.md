## Problem

On the `/subscription` paywall, the top header puts three items in a single non-wrapping flex row:

1. Title ("Start Your Child's Adventure" / Back button)
2. "Welcome, Parent!" badge
3. Log Out button (only when `user` is signed in)

At iPhone widths (~390px CSS), the badge + Log Out button overflow the right edge and the button is clipped off-screen. The code is present — it just isn't visible.

## Fix (scoped to `src/pages/Subscription.tsx`, header block, lines ~280–311)

Restructure the header so Log Out is always visible on mobile:

- Wrap the right-side group (`badge` + `Log Out`) so it can break to a second line if needed: add `flex-wrap justify-end` to the right container.
- Shrink the Log Out button on mobile: icon-only at `<sm`, icon+label at `sm+`. Use `LogOut` icon with `sr-only` label on mobile so it remains accessible.
- Shorten the badge text on small screens to "Parent" / "Offer" (full text returns at `sm+`) to free up horizontal space.
- Keep desktop appearance unchanged.

No business logic changes — purely presentational tweaks to the existing JSX in the header.

## Note on the screenshot

The Roblox/Gaming comparison card visible in the screenshot was removed in the previous turn. The native iOS app is still showing a cached build. After this fix, you'll need to run `npx cap sync ios` and rebuild in Xcode to see both changes (logout visible + comparison cards gone) on device.
