-- Fix security vulnerability: Add SELECT policy to waitlist table to prevent email harvesting
-- Users can only view their own waitlist entry, not others' email addresses

CREATE POLICY "Users can view their own waitlist entry" 
ON public.waitlist 
FOR SELECT 
USING (device_id = current_setting('app.device_id'::text, true));

-- Optional: Create a policy for admins to view aggregate waitlist data if needed
-- This would require implementing user roles first, so leaving commented for now
-- CREATE POLICY "Admins can view all waitlist entries" 
-- ON public.waitlist 
-- FOR SELECT 
-- USING (public.has_role(auth.uid(), 'admin'));