-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add RLS policies for banned_users table
CREATE POLICY "Admins can view all bans"
ON public.banned_users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert bans"
ON public.banned_users
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bans"
ON public.banned_users
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policies for content_violations table
CREATE POLICY "Admins can view violations"
ON public.content_violations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert violations"
ON public.content_violations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view their own violations
CREATE POLICY "Users can view own violations"
ON public.content_violations
FOR SELECT
USING (auth.uid() = user_id OR device_id = current_setting('app.device_id'::text, true));

-- Create function to check if user/device is banned
CREATE OR REPLACE FUNCTION public.is_banned(_user_id UUID DEFAULT NULL, _device_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.banned_users
    WHERE 
      ((_user_id IS NOT NULL AND user_id = _user_id) OR 
       (_device_id IS NOT NULL AND device_id = _device_id))
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;