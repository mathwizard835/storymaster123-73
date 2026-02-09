UPDATE user_stories 
SET started_at = started_at - interval '60 days' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davenmantri@gmail.com') 
AND started_at >= now() - interval '30 days';