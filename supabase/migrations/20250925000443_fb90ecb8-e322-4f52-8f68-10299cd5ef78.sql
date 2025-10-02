-- Fix security issue: Strengthen waitlist RLS policies to prevent email harvesting

-- First, ensure device_id cannot be null (critical for security)
ALTER TABLE public.waitlist ALTER COLUMN device_id SET NOT NULL;

-- Drop the existing SELECT policy that has potential security issues
DROP POLICY IF EXISTS "Users can view their own waitlist entry" ON public.waitlist;

-- Create a more restrictive SELECT policy that:
-- 1. Requires authentication context to be properly set
-- 2. Validates device_id is not empty/null
-- 3. Only allows access when device_id matches exactly
CREATE POLICY "Secure device-based waitlist access" 
ON public.waitlist 
FOR SELECT 
USING (
  device_id IS NOT NULL 
  AND device_id != '' 
  AND device_id = current_setting('app.device_id'::text, false)
  AND current_setting('app.device_id'::text, false) IS NOT NULL
  AND current_setting('app.device_id'::text, false) != ''
);

-- Also strengthen the INSERT policy to ensure device_id is always set properly
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

CREATE POLICY "Secure waitlist signup" 
ON public.waitlist 
FOR INSERT 
WITH CHECK (
  device_id IS NOT NULL 
  AND device_id != '' 
  AND email IS NOT NULL 
  AND email != ''
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Add a function to validate device context is properly set before operations
CREATE OR REPLACE FUNCTION public.validate_device_context()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT current_setting('app.device_id'::text, false) IS NOT NULL 
    AND current_setting('app.device_id'::text, false) != '';
$$;