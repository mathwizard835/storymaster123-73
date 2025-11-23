-- Add user_id column to user_subscriptions table for user-based subscription tracking
ALTER TABLE user_subscriptions 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);