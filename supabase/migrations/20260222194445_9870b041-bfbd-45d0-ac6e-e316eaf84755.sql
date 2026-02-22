-- Update premium plan to $6.99 unlimited
UPDATE subscription_plans 
SET price_monthly = 6.99, 
    story_limit = NULL, 
    features = '{"daily_stories": -1, "premium_characters": true, "squad_missions": true, "read_to_me": false, "priority_support": true, "custom_avatars": true, "early_access": true}'::jsonb
WHERE id = 'c414127f-af31-47f1-b474-d59bf4956e1f';

-- Update premium_plus plan to $7.99 unlimited + read-to-me
UPDATE subscription_plans 
SET price_monthly = 7.99, 
    story_limit = NULL, 
    features = '{"daily_stories": -1, "premium_characters": true, "squad_missions": true, "read_to_me": true, "priority_support": true, "custom_avatars": true, "early_access": true}'::jsonb
WHERE id = '1f07f062-4123-4e51-9c5d-9541836a8f1c';