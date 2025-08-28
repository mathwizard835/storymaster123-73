-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2),
  features JSONB NOT NULL,
  story_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default plans
INSERT INTO public.subscription_plans (name, price_monthly, features, story_limit) VALUES
('free', 0.00, '{"daily_stories": 1, "premium_characters": false, "squad_missions": false}', 1),
('basic', 4.99, '{"daily_stories": 3, "premium_characters": true, "squad_missions": true, "priority_support": true}', 100),
('premium', 9.99, '{"daily_stories": -1, "premium_characters": true, "squad_missions": true, "priority_support": true, "early_access": true, "custom_avatars": true}', -1);

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_device_id TEXT NOT NULL,
  referred_device_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, expired
  bonus_stories_earned INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_device_id, referred_device_id)
);

-- Create daily streaks table
CREATE TABLE public.daily_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_story_date DATE,
  bonus_stories_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create waitlist table
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  device_id TEXT,
  referral_code TEXT,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story shares table
CREATE TABLE public.story_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  share_type TEXT NOT NULL, -- social, link, image
  platform TEXT, -- twitter, facebook, instagram, etc
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Subscription plans are viewable by everyone" 
ON public.subscription_plans FOR SELECT USING (true);

CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions FOR SELECT USING (true);

CREATE POLICY "Users can insert their own subscription" 
ON public.user_subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their referrals" 
ON public.referrals FOR SELECT USING (true);

CREATE POLICY "Users can create referrals" 
ON public.referrals FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their streaks" 
ON public.daily_streaks FOR SELECT USING (true);

CREATE POLICY "Users can manage their streaks" 
ON public.daily_streaks FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their streaks" 
ON public.daily_streaks FOR UPDATE USING (true);

CREATE POLICY "Anyone can join waitlist" 
ON public.waitlist FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can track their shares" 
ON public.story_shares FOR INSERT WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_streaks_updated_at
BEFORE UPDATE ON public.daily_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();