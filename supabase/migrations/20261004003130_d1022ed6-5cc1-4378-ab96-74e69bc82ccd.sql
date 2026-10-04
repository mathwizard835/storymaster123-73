CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _age integer;
  _consent boolean;
BEGIN
  BEGIN
    _age := NULLIF(new.raw_user_meta_data->>'child_age', '')::integer;
  EXCEPTION WHEN others THEN _age := NULL;
  END;
  BEGIN
    _consent := NULLIF(new.raw_user_meta_data->>'parental_consent_given', '')::boolean;
  EXCEPTION WHEN others THEN _consent := NULL;
  END;

  INSERT INTO public.profiles (id, email, display_name, child_age, parent_email, parental_consent_given, parental_consent_at, parental_consent_method)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'display_name',
    _age,
    NULLIF(new.raw_user_meta_data->>'parent_email', ''),
    CASE WHEN _age IS NOT NULL AND _age < 13 THEN COALESCE(_consent, true) ELSE _consent END,
    CASE WHEN _age IS NOT NULL AND _age < 13 THEN now() ELSE NULL END,
    CASE WHEN _age IS NOT NULL AND _age < 13 THEN 'email_verification' ELSE NULL END
  );
  RETURN new;
END;
$function$;