-- Khabo Ki? — keep the new trigger functions off the REST API
--
-- Postgres grants EXECUTE to PUBLIC on every new function, and Supabase adds
-- anon/authenticated on top, so each of these appeared at /rest/v1/rpc/<name>.
-- Calling a trigger function directly errors out rather than doing damage, but
-- they are internal plumbing and have no business being part of the API
-- surface — same treatment 0004 gave handle_new_user and the profile guard.

revoke execute on function public.stamp_meal_price()        from public, anon, authenticated;
revoke execute on function public.freeze_meal_price()       from public, anon, authenticated;
revoke execute on function public.seed_event_participants() from public, anon, authenticated;
revoke execute on function public.touch_event()             from public, anon, authenticated;
revoke execute on function public.check_payment_payee()     from public, anon, authenticated;

-- meal_price() is read by the app, so signed-in users keep it.
revoke execute on function public.meal_price() from public, anon;
grant  execute on function public.meal_price() to authenticated;
