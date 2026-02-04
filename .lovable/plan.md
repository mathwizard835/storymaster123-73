

# Rename Premium to Adventure Pass + UI/UX Improvements

## Summary

This plan addresses multiple interconnected changes:
1. **Rename "Premium" to "Adventure Pass"** across the entire application
2. **Change "StoryMaster" to "StoryMaster Kids"** with responsive optimization for small screens
3. **Fix story pack visibility** - ensure they work properly for subscribers only
4. **Clarify story limits** - ensure "per month" messaging is consistent (Free = 3/month, Adventure Pass = 10/month)
5. **Simplify the sign-in process** with clearer onboarding
6. **Show Apple Pay button on all platforms** (visible placeholder for UI verification)

---

## Technical Changes

### 1. Home Page (`src/pages/Index.tsx`)

**Branding Update:**
- Change "StoryMaster" title to "StoryMaster Kids" with responsive optimization
- For small screens: Show only "StoryMaster Kids" without the visibility issues where you see it cut off at the top. 
- Update the aria-labels from "Upgrade to Premium" to "Upgrade to Adventure Pass"

**Premium → Adventure Pass:**
- Line 103: Update aria-label from "Upgrade to Premium" to "Upgrade to Adventure Pass"
- Line 295: Same aria-label update
- Comments on lines 98, 290: Update from "Floating Premium Button" to "Floating Adventure Pass Button"

**Header optimization for small devices:**
Current (line 307-312):
```tsx
<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  StoryMaster
</span>
<br />
<span className="text-foreground">Screen Time You Can Feel Good About</span>
```

Updated:
```tsx
<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  StoryMaster Kids
</span>
<span className="block text-3xl md:text-5xl mt-2 text-foreground">Screen Time You Can Feel Good About</span>
```

### 2. Subscription Page (`src/pages/Subscription.tsx`)

**Premium → Adventure Pass updates:**
- Line 94: "premium features" → "Adventure Pass features"
- Line 103-104: "premium-theme" comment already says premium, update related comments
- Line 141: "StoryMaster Adventure Pass!" (already correct)
- Line 270: "Adventure Pass now" (already correct)
- Line 299: "premium stories" → "Adventure Pass stories"
- Line 323: Comment update "premium" → "Adventure Pass"
- Line 332-333: Already says "Active Adventure Pass"
- Line 357: "Adventure Pass features" (already correct)
- Line 382, 399: "Adventure Pass Plus" (already correct)

**Story limits messaging:**
- Line 71: Change "10 interactive stories per month" to "10 stories per month (rolling 30-day)"
- Line 610: Change description to clarify monthly limit

**Apple Pay button - make visible on all platforms:**
- Lines 696-713: Remove the `{isIOSPlatform() && (` conditional wrapper
- Show the button on all platforms with platform-specific messaging

### 3. Dashboard (`src/pages/Dashboard.tsx`)

**Premium → Adventure Pass:**
- Line 58: `plan?.name === "premium"` check remains but badge text updates
- Line 262: "Upgrade to Premium" → "Upgrade to Adventure Pass"
- Line 262: "Premium Member ✨" → "Adventure Pass ✨"
- Lines 183, 316, 319: Badge text "PREMIUM" → "ADVENTURE PASS" or "PRO"
- Line 323: "premium experience" → "Adventure Pass experience"

### 4. Mobile Bottom Nav (`src/components/layout/MobileBottomNav.tsx`)

- Line 18: Change label from 'Premium' to 'Pass' (shorter for mobile)

### 5. Story Limit Widget (`src/components/StoryLimitWidget.tsx`)

**Premium → Adventure Pass:**
- Line 44: Badge text "Premium" → "Adventure Pass"
- Line 115: "Upgrade for 10 Stories/Month" (already correct)
- Line 121: "10" text correct, but label should say "monthly stories" not "daily_stories"

### 6. Subscription Modal (`src/components/SubscriptionModal.tsx`)

**Fix stories per month messaging:**
- Lines 115-117: Change from "daily_stories" logic to show monthly stories
- Line 117: `${plan.features.daily_stories} story per day` → Show monthly limit instead

**Premium → Adventure Pass:**
- Line 55: Plan icon for 'premium' stays, but text updates
- Line 91-92: "Most Popular" badge stays
- Line 101: Capitalize and update plan name display for "premium" to show "Adventure Pass"

### 7. Auth Page (`src/pages/Auth.tsx`)

**Simplify sign-in flow:**
- Line 318: "StoryMaster Quest" → "StoryMaster Kids"
- Line 320: Add clearer subtitle for parents
- Lines 325-331: Simplify the "Join the Quest" messaging
- Add a "What is StoryMaster Kids?" helper text for first-time visitors
- Make the sign-in vs sign-up choice clearer with better descriptions

**Proposed changes:**
- Add a brief explanation of what the app does above the auth card
- Change "Join the Quest" to "Create Your Account" or "Get Started"
- Add helper text: "New here? Sign up is free!" and "Already have an account? Sign in"

### 8. Story Pack Purchase (`src/components/StoryPackPurchase.tsx`)

- Already restricted to subscribers only (good)
- Line 169-170: "Adventure Pass member" (already correct)
- Verify the checkout flow works properly by ensuring edge function is deployed

### 9. Additional Files to Update

**Subscription Success (`src/pages/SubscriptionSuccess.tsx`):**
- Line 46: "Welcome to Premium!" → "Welcome to Adventure Pass!"
- Line 53: "premium access" → "Adventure Pass"
- Line 86: "premium subscription" → "Adventure Pass subscription"
- Line 103: "premium features" → "Adventure Pass features"

**Mission Page (`src/pages/Mission.tsx`):**
- Line 367: "Upgrade for 10 stories per month!" (already correct)

**Story lib (`src/lib/story.ts`):**
- Line 142: "Upgrade to Premium" → "Upgrade to Adventure Pass"

---

## Files to Modify

1. `src/pages/Index.tsx` - Branding, responsive header, aria-labels
2. `src/pages/Subscription.tsx` - Premium→Adventure Pass, Apple Pay visibility
3. `src/pages/Dashboard.tsx` - Badges and upgrade button text
4. `src/components/layout/MobileBottomNav.tsx` - Nav label
5. `src/components/StoryLimitWidget.tsx` - Badge text
6. `src/components/SubscriptionModal.tsx` - Plan names and story limits
7. `src/pages/Auth.tsx` - Simplified sign-in flow and branding
8. `src/pages/SubscriptionSuccess.tsx` - Success messaging
9. `src/lib/story.ts` - Upgrade message

---

## Verification Checklist

After implementation:
- [ ] "StoryMaster Kids" visible on all screen sizes
- [ ] Header text doesn't get cut off on mobile
- [ ] All "Premium" references now say "Adventure Pass"
- [ ] Story limits show "X stories/month" not "X stories/day"
- [ ] Apple Pay button visible on web preview (with "iOS only" messaging)
- [ ] Sign-in page clearly explains what the app is
- [ ] Story packs only appear for Adventure Pass subscribers

