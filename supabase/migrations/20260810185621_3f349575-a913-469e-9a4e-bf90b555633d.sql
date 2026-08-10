ALTER TABLE public.support_requests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

GRANT SELECT, UPDATE ON public.support_requests TO authenticated;

DROP POLICY IF EXISTS "Admins can view support requests" ON public.support_requests;
CREATE POLICY "Admins can view support requests"
ON public.support_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update support requests" ON public.support_requests;
CREATE POLICY "Admins can update support requests"
ON public.support_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_support_requests_updated_at ON public.support_requests;
CREATE TRIGGER update_support_requests_updated_at
BEFORE UPDATE ON public.support_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();