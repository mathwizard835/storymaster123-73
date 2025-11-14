-- Fix free plan to not include read_to_me
UPDATE subscription_plans 
SET features = jsonb_set(features, '{read_to_me}', 'false')
WHERE name = 'free';