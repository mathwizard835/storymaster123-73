
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS child_age integer,
ADD COLUMN IF NOT EXISTS parent_email text,
ADD COLUMN IF NOT EXISTS parental_consent_given boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parental_consent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS parental_consent_method text DEFAULT 'email_verification';
