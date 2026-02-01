-- Allow anyone to check if an email is banned (for signup/signin blocking)
-- This is a permissive policy that allows checking ban status by email
CREATE POLICY "Anyone can check if email is banned"
ON public.banned_users
FOR SELECT
USING (true);