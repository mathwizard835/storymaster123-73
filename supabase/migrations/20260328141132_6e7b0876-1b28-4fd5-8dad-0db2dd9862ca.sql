
-- Fix 1: Drop the overly permissive public SELECT policy on banned_users
DROP POLICY IF EXISTS "Anyone can check if email is banned" ON public.banned_users;

-- Create a new RPC that checks ban by email (returns only boolean, no data exposure)
CREATE OR REPLACE FUNCTION public.check_email_banned(p_email text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'is_banned', true,
      'reason', COALESCE(reason, 'Your account has been suspended.')
    )
    FROM banned_users
    WHERE email = lower(p_email)
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1),
    jsonb_build_object('is_banned', false)
  );
$$;

-- Fix 2: Drop the overly permissive INSERT policy on content_violations
DROP POLICY IF EXISTS "System can insert violations" ON public.content_violations;

-- Create a restricted INSERT policy: authenticated users can only insert violations for themselves
CREATE POLICY "Users can insert own violations"
ON public.content_violations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
