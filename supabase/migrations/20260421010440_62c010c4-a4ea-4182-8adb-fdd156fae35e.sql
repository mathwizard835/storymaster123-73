
-- =====================================================================
-- FIX 1: user_subscriptions — remove fully-open policies
-- =====================================================================
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.user_subscriptions;

-- Only authenticated users can see THEIR OWN subscription (by user_id only).
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No client-side INSERT/UPDATE/DELETE.
-- Subscription lifecycle is owned exclusively by Stripe/RevenueCat webhooks
-- which use the service role key and bypass RLS.
-- (Intentionally NO insert/update/delete policies for anon or authenticated.)


-- =====================================================================
-- FIX 2: user_roles — prevent privilege escalation
-- =====================================================================
-- Revoke direct table grants from client roles to ensure only RLS-permitted
-- operations are possible (defense in depth).
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

-- Only admins can manage roles. Use the existing has_role() security-definer
-- function to avoid recursive RLS checks.
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- =====================================================================
-- FIX 3: Replace spoofable device_id RLS with auth.uid()-based RLS
-- =====================================================================

-- ---- daily_streaks: add user_id and switch policies ----
ALTER TABLE public.daily_streaks
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_daily_streaks_user_id ON public.daily_streaks(user_id);

DROP POLICY IF EXISTS "Users can view their streaks" ON public.daily_streaks;
DROP POLICY IF EXISTS "Users can update their streaks" ON public.daily_streaks;
DROP POLICY IF EXISTS "Users can manage their streaks" ON public.daily_streaks;

CREATE POLICY "Users can view their own streaks"
ON public.daily_streaks
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own streaks"
ON public.daily_streaks
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own streaks"
ON public.daily_streaks
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ---- story_completions: add user_id and switch policies ----
ALTER TABLE public.story_completions
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_story_completions_user_id ON public.story_completions(user_id);

DROP POLICY IF EXISTS "Allow device to read own completions" ON public.story_completions;
DROP POLICY IF EXISTS "Allow device to insert completions" ON public.story_completions;

CREATE POLICY "Users can view their own completions"
ON public.story_completions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own completions"
ON public.story_completions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());


-- ---- referrals: add user-id columns and switch policies ----
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid,
  ADD COLUMN IF NOT EXISTS referred_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user_id ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);

DROP POLICY IF EXISTS "Users can view their referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update their referrals" ON public.referrals;

CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Users can create referrals as themselves"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Users can update their own referrals"
ON public.referrals
FOR UPDATE
TO authenticated
USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid())
WITH CHECK (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());


-- ---- story_shares: add user_id and switch policies ----
ALTER TABLE public.story_shares
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_story_shares_user_id ON public.story_shares(user_id);

DROP POLICY IF EXISTS "Users can track their shares" ON public.story_shares;

CREATE POLICY "Users can insert their own shares"
ON public.story_shares
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own shares"
ON public.story_shares
FOR SELECT
TO authenticated
USING (user_id = auth.uid());


-- ---- waitlist: add user_id and switch policies ----
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON public.waitlist(user_id);

DROP POLICY IF EXISTS "Users can view only their own waitlist entry" ON public.waitlist;
DROP POLICY IF EXISTS "Users can insert their own waitlist entry" ON public.waitlist;

CREATE POLICY "Users can view their own waitlist entry"
ON public.waitlist
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own waitlist entry"
ON public.waitlist
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND email IS NOT NULL
  AND email <> ''
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);
