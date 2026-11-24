DROP POLICY IF EXISTS "Anyone can submit a valid support request" ON public.support_requests;
CREATE POLICY "Anyone can submit a valid support request"
ON public.support_requests FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND status = 'new'
  AND admin_notes IS NULL
  AND replied_at IS NULL
  AND char_length(btrim(name)) BETWEEN 1 AND 100
  AND char_length(email) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(btrim(message)) BETWEEN 1 AND 5000
  AND (app_version IS NULL OR char_length(app_version) <= 100)
  AND (device_info IS NULL OR char_length(device_info) <= 1000)
  AND (page IS NULL OR char_length(page) <= 500)
);