CREATE TABLE public.support_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  admin_id uuid,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'queued',
  error_message text,
  provider_message_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_replies_request_id_idx ON public.support_replies(request_id);

GRANT SELECT ON public.support_replies TO authenticated;
GRANT ALL ON public.support_replies TO service_role;

ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view support replies"
ON public.support_replies FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert support replies"
ON public.support_replies FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());