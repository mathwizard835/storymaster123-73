-- Update premium plan to include read_to_me
UPDATE subscription_plans 
SET features = '{"daily_stories": -1, "premium_characters": true, "squad_missions": true, "read_to_me": true, "priority_support": true, "early_access": true, "custom_avatars": true}'::jsonb
WHERE id = 'c414127f-af31-47f1-b474-d59bf4956e1f';

-- Migrate any existing premium_plus subscriptions to premium plan FIRST
UPDATE user_subscriptions 
SET plan_id = 'c414127f-af31-47f1-b474-d59bf4956e1f'
WHERE plan_id = '1f07f062-4123-4e51-9c5d-9541836a8f1c';

-- Now safe to delete premium_plus plan
DELETE FROM subscription_plans WHERE id = '1f07f062-4123-4e51-9c5d-9541836a8f1c';