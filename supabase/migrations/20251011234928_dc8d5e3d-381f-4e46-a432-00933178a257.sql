-- Create content violations tracking table
CREATE TABLE IF NOT EXISTS public.content_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  violation_type TEXT NOT NULL DEFAULT 'inappropriate_content',
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create banned users table
CREATE TABLE IF NOT EXISTS public.banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  banned_by TEXT NOT NULL DEFAULT 'system',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_banned_users_user_id ON public.banned_users(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_banned_users_device_id ON public.banned_users(device_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_banned_users_email ON public.banned_users(email);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_violations_user_id ON public.content_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_content_violations_device_id ON public.content_violations(device_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_expires_at ON public.banned_users(expires_at);

-- Enable RLS
ALTER TABLE public.content_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- No public access policies - only service role can manage these tables