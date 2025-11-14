-- Update subscription_plans table to include read_to_me feature
-- First, let's clear existing plans and recreate with new structure

DELETE FROM subscription_plans;

-- Free tier (1 story trial)
INSERT INTO subscription_plans (name, price_monthly, story_limit, features)
VALUES (
  'free',
  0,
  1,
  '{
    "daily_stories": 1,
    "premium_characters": false,
    "squad_missions": false,
    "read_to_me": true
  }'::jsonb
);

-- Basic tier (3 stories per month after signup)
INSERT INTO subscription_plans (name, price_monthly, story_limit, features)
VALUES (
  'basic',
  0,
  3,
  '{
    "daily_stories": 3,
    "premium_characters": false,
    "squad_missions": false,
    "read_to_me": false
  }'::jsonb
);

-- Premium tier (10 stories per month, no Read-To-Me)
INSERT INTO subscription_plans (name, price_monthly, story_limit, features)
VALUES (
  'premium',
  4.99,
  10,
  '{
    "daily_stories": 10,
    "premium_characters": true,
    "squad_missions": true,
    "read_to_me": false,
    "priority_support": true,
    "custom_avatars": true
  }'::jsonb
);

-- Premium Plus tier (10 stories per month WITH Read-To-Me)
INSERT INTO subscription_plans (name, price_monthly, story_limit, features)
VALUES (
  'premium_plus',
  5.99,
  10,
  '{
    "daily_stories": 10,
    "premium_characters": true,
    "squad_missions": true,
    "read_to_me": true,
    "priority_support": true,
    "custom_avatars": true
  }'::jsonb
);