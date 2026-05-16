CREATE TABLE public.guest_demo_usage (
  fingerprint text PRIMARY KEY,
  ip_prefix text,
  user_agent text,
  used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_demo_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_guest_demo_usage_used_at ON public.guest_demo_usage(used_at);