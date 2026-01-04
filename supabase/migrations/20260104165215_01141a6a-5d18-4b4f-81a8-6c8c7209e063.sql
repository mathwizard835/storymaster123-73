-- Add trial_used column to profiles table to track if user has used their free trial
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_trial_used ON public.profiles(trial_used);