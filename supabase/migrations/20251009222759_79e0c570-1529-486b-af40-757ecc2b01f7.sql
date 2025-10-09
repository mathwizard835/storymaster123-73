-- Drop existing waitlist policies
DROP POLICY IF EXISTS "Secure device-based waitlist access" ON public.waitlist;
DROP POLICY IF EXISTS "Secure waitlist signup" ON public.waitlist;

-- Create improved SELECT policy that properly restricts access to own device only
CREATE POLICY "Users can view only their own waitlist entry"
ON public.waitlist
FOR SELECT
USING (device_id = current_setting('app.device_id'::text, true));

-- Create improved INSERT policy that validates device_id matches session
CREATE POLICY "Users can insert their own waitlist entry"
ON public.waitlist
FOR INSERT
WITH CHECK (
  device_id = current_setting('app.device_id'::text, true)
  AND device_id IS NOT NULL 
  AND device_id <> ''::text
  AND email IS NOT NULL 
  AND email <> ''::text 
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text
);