INSERT INTO public.user_roles (user_id, role)
VALUES ('68d86555-401a-4e97-bcba-aacd9e547d57', 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;