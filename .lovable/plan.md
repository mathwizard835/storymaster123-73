

## Fix Stale "10 Stories" Text in StoryLimitWidget

The recent pricing update to unlimited stories missed updating the `StoryLimitWidget` component, which still references "10 stories/month" in two places.

### Changes

**File: `src/components/StoryLimitWidget.tsx`**

1. **Line 115** - Change button text from `"Upgrade for 10 Stories/Month"` to `"Upgrade for Unlimited Stories"`
2. **Line 121** - Change text from `"Enjoying 10 monthly stories with Adventure Pass"` to `"Enjoying unlimited stories with Adventure Pass"`
3. **Lines 78-81** - For premium users, show "Unlimited" instead of the numeric counter (since `monthlyLimit` is 999999 for unlimited plans, showing `used/999999` looks broken)

### Technical Details

- In `StoryLimitWidget`, detect unlimited plans by checking if `storyData.monthlyLimit >= 999999` (the sentinel value set in `getStoriesRemaining()`)
- When unlimited, display usage as just the count ("X stories this month") without a denominator or progress bar percentage
- Hide the progress bar for unlimited users since it would always show ~0%

### No Other Files Need Changes

- `subscription.ts` - correctly handles unlimited (confirmed)
- `Subscription.tsx` - already shows $6.99 and "Unlimited" (confirmed)
- Database `subscription_plans` - already updated with correct prices and `story_limit: null` (confirmed)
- Webhook `stripe-webhook/index.ts` - plan ID mapping is correct (confirmed)

### Stripe Action Required (by you, not code)

You must create two Stripe prices and update two Supabase secrets before payments will work:
- `STRIPE_PREMIUM_PRICE_ID` = price ID for $6.99/month product
- `STRIPE_PREMIUM_PLUS_PRICE_ID` = price ID for $7.99/month product

