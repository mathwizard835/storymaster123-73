update public.subscription_plans
set price_monthly = 4.99
where lower(name) like '%premium%' or lower(name) = 'adventure pass';