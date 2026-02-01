
# Fix Stripe Subscription Error

## Problem Identified
The subscription checkout is failing because your Stripe secrets contain **product IDs** instead of **price IDs**. Stripe checkout sessions require price IDs.

**Error from logs:** `No such price: 'prod_TtsO12eOCIdPpP'`

## Root Cause
When the live Stripe keys were configured, product IDs were entered instead of price IDs for the subscription plans.

## Solution

### Update Two Secrets

| Secret Name | Current (Wrong) | Correct Value |
|-------------|-----------------|---------------|
| `STRIPE_PREMIUM_PRICE_ID` | `prod_TtsN4MjKXJrxcN` | `price_1Sw4cqRu0lh0G69aHa30gMjC` |
| `STRIPE_PREMIUM_PLUS_PRICE_ID` | `prod_TtsO12eOCIdPpP` | `price_1Sw4dWRu0lh0G69aY4pysSsV` |

### What This Fixes
- Premium plan ($4.99/month) checkout will work
- Premium Plus plan ($5.99/month) checkout will work
- Stripe webhook subscription tracking will function correctly

### No Code Changes Required
The edge function code is correct - it properly uses these environment variables. Only the secret values need to be corrected.
