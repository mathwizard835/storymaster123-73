-- Fix RLS policies to properly restrict access based on device_id
-- This replaces the 'true' conditions that allow unrestricted access

-- Update story_completions policies
DROP POLICY IF EXISTS "Allow device to read own completions" ON public.story_completions;
DROP POLICY IF EXISTS "Allow device to insert completions" ON public.story_completions;

CREATE POLICY "Allow device to read own completions" 
ON public.story_completions 
FOR SELECT 
USING (device_id = current_setting('app.device_id', true));

CREATE POLICY "Allow device to insert completions" 
ON public.story_completions 
FOR INSERT 
WITH CHECK (device_id = current_setting('app.device_id', true));

-- Update daily_streaks policies  
DROP POLICY IF EXISTS "Users can view their streaks" ON public.daily_streaks;
DROP POLICY IF EXISTS "Users can update their streaks" ON public.daily_streaks;
DROP POLICY IF EXISTS "Users can manage their streaks" ON public.daily_streaks;

CREATE POLICY "Users can view their streaks" 
ON public.daily_streaks 
FOR SELECT 
USING (device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can update their streaks" 
ON public.daily_streaks 
FOR UPDATE 
USING (device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can manage their streaks" 
ON public.daily_streaks 
FOR INSERT 
WITH CHECK (device_id = current_setting('app.device_id', true));

-- Update user_subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can insert their own subscription" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (device_id = current_setting('app.device_id', true));

-- Update referrals policies
DROP POLICY IF EXISTS "Users can view their referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;

CREATE POLICY "Users can view their referrals" 
ON public.referrals 
FOR SELECT 
USING (referrer_device_id = current_setting('app.device_id', true) OR referred_device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can create referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (referrer_device_id = current_setting('app.device_id', true) OR referred_device_id = current_setting('app.device_id', true));

-- Update referrals to allow updates for completing referrals
CREATE POLICY "Users can update their referrals" 
ON public.referrals 
FOR UPDATE 
USING (referrer_device_id = current_setting('app.device_id', true) OR referred_device_id = current_setting('app.device_id', true));

-- Update story_shares policies
DROP POLICY IF EXISTS "Users can track their shares" ON public.story_shares;

CREATE POLICY "Users can track their shares" 
ON public.story_shares 
FOR INSERT 
WITH CHECK (device_id = current_setting('app.device_id', true));