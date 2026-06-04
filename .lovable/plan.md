## Goal

Replace the native `confirm()` cancel dialog on the Web (Stripe) cancellation path with a designed retention modal. Keep the iOS App Store flow unchanged (Apple requires its own confirmation/redirect).

## Changes

**File: `src/pages/Subscription.tsx**`

1. Add a new state `retentionOpen: boolean`.
2. Split `handleCancelSubscription` into two functions:
  - `handleCancelClick()` — entry point bound to the "Cancel Subscription" button.
    - If iOS/Apple IAP path: keep existing behavior unchanged (App Store redirect + existing confirm).
    - If Web/Stripe: instead of `confirm(...)`, set `retentionOpen = true`.
  - `confirmCancelSubscription()` — the existing Stripe cancel logic (edge function call, toast, refresh) extracted as-is. Triggered from the modal's "Continue to Cancel" button.
3. Render a new retention `<Dialog>` (shadcn) at the bottom of the page, controlled by `retentionOpen`:
  - **Heading:** "Before you go..."
  - **Body:** "A single physical book costs around $10. For just $4.99/month, you are giving your child an infinite, personalized library built just for them."
  - **Primary button:** "Keep My Plan" — closes the modal, no backend call.
  - **Secondary text button (ghost/link variant, smaller):** "Continue to Cancel" — closes the modal, then runs `confirmCancelSubscription()`.

## Design

Use existing shadcn `Dialog`, `Button`, semantic tokens (primary, muted-foreground). Centered content, large heading, supportive body copy, primary CTA full-width and bold, secondary as a small underlined text link beneath it. Subtle book/sparkle icon (lucide) above the heading for warmth. Keep within the project's existing semantic-token design system — no hardcoded colors.

### Implementation Notes for Lovable:

- **State Management:** Ensure `confirmCancelSubscription` safely accesses current component states (like loading states or user IDs) without creating stale closures.
- **Loading UI:** When "Continue to Cancel" is clicked, immediately close the modal and trigger the existing loading spinner/state so the user cannot double-submit.
- **Platform Check:** Determine the iOS/Apple IAP path by checking our existing database/auth user metadata (e.g., payment provider type) rather than relying on browser user-agent strings.

## Out of scope

- No changes to `cancelSubscription()` in `src/lib/subscription.ts` or the `stripe-cancel-subscription` edge function.
- iOS App Store flow unchanged.
- No copy/UI changes elsewhere on the Subscription page.