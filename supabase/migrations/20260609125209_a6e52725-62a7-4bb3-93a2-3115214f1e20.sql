
-- 1) user_stories: remove public/anon access to shared stories (was leaking child profile JSON + fingerprint)
DROP POLICY IF EXISTS "Anyone can view publicly shared stories" ON public.user_stories;

-- 2) profiles: restrict policies to authenticated role only
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3) content_violations: remove device_id bypass branch from SELECT policy
DROP POLICY IF EXISTS "Users can view own violations" ON public.content_violations;
CREATE POLICY "Users can view own violations"
  ON public.content_violations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4) Lock down SECURITY DEFINER helper functions: revoke EXECUTE from anon/authenticated
--    These are only meant to be called server-side or via RLS evaluation by the policy planner.
REVOKE EXECUTE ON FUNCTION public.validate_device_context() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_prompt_hash(text, boolean) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_banned(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_email_banned(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- has_role is referenced inside RLS policies. The policy planner runs as the
-- table owner so EXECUTE for callers is not required, but grant to authenticated
-- to be safe for direct RPC calls used by admin UI.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid, text) TO authenticated;
