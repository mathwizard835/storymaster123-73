DROP POLICY IF EXISTS "Subscription plans are viewable by everyone" ON public.subscription_plans;
CREATE POLICY "Signed-in users can view subscription plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.enforce_daily_streak_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _new_current integer;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.bonus_stories_earned := 0;
    NEW.current_streak := LEAST(GREATEST(COALESCE(NEW.current_streak, 0), 0), 1);
    NEW.longest_streak := NEW.current_streak;
    IF NEW.last_story_date IS NOT NULL AND abs(NEW.last_story_date - current_date) > 1 THEN
      NEW.last_story_date := current_date;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: derive values from the stored row, never from the client.
  IF NEW.last_story_date IS NOT DISTINCT FROM OLD.last_story_date
     OR NEW.last_story_date IS NULL
     OR abs(NEW.last_story_date - current_date) > 1
     OR (OLD.last_story_date IS NOT NULL AND NEW.last_story_date <= OLD.last_story_date) THEN
    NEW.last_story_date := OLD.last_story_date;
    NEW.current_streak := OLD.current_streak;
    NEW.longest_streak := OLD.longest_streak;
    NEW.bonus_stories_earned := OLD.bonus_stories_earned;
    RETURN NEW;
  END IF;

  IF OLD.last_story_date IS NOT NULL AND NEW.last_story_date - OLD.last_story_date = 1 THEN
    _new_current := COALESCE(OLD.current_streak, 0) + 1;
  ELSE
    _new_current := 1;
  END IF;

  NEW.current_streak := _new_current;
  NEW.longest_streak := GREATEST(COALESCE(OLD.longest_streak, 0), _new_current);
  NEW.bonus_stories_earned := COALESCE(OLD.bonus_stories_earned, 0)
    + CASE WHEN _new_current IN (3, 7, 14, 30, 50, 100) THEN _new_current / 3 ELSE 0 END;
  NEW.user_id := OLD.user_id;
  NEW.device_id := OLD.device_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_daily_streak_rules ON public.daily_streaks;
CREATE TRIGGER enforce_daily_streak_rules
  BEFORE INSERT OR UPDATE ON public.daily_streaks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_streak_rules();