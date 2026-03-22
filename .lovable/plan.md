

## Landing Page Marketing Improvements

Based on the previous analysis, here are the changes to implement:

### 1. Rename "Play - Join Your Quest" → "Sign Up!" (3 locations)
- Line 169: Hero section CTA
- Line 357: Mid-page CTA  
- Line 734: Final CTA section

### 2. Remove "It's completely Free!" block (lines 701-708)
Replace with a trial-framing message: **"Try 3 Free Stories"** with copy like "No credit card required • See why kids love it • Upgrade anytime"

### 3. Reframe free tier as trial
- Update the replacement block to position the free tier as a taste of the product rather than the main value prop
- Keep the "Updated weekly" badge

### 4. Simplify final CTA copy
- Tighten the heading and subhead to be more parent-focused and action-oriented

### Technical details
- All changes are in `src/pages/Index.tsx`
- 3 string replacements for button text
- 1 block replacement (lines 701-708) for the free tier messaging

