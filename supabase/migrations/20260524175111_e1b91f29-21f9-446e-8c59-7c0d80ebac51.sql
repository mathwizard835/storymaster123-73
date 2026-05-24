INSERT INTO public.user_subscriptions (user_id, device_id, plan_id, status, starts_at, expires_at)
VALUES (
  'd99b5afc-f6c6-4c6b-a7e7-fce80630adb3',
  'manual-grant',
  'c414127f-af31-47f1-b474-d59bf4956e1f',
  'active',
  now(),
  now() + interval '1 year'
);