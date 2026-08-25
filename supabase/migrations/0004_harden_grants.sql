-- Khabo Ki? — lock down function execution
-- Postgres grants EXECUTE to PUBLIC by default, so revoking from
-- authenticated/anon alone leaves functions reachable. Strip PUBLIC first,
-- then hand back only what the app actually calls.

alter function app.tz() set search_path = '';
alter function public.app_today() set search_path = public, app;
alter function public.is_active_staff() set search_path = public;
alter function public.is_admin() set search_path = public;

-- Internal only: called by publish_menu / by triggers, never over the API.
revoke execute on function public.run_auto_picks(uuid)        from public, anon, authenticated;
revoke execute on function public.handle_new_user()           from public, anon, authenticated;
revoke execute on function public.guard_profile_privileges()  from public, anon, authenticated;

revoke execute on function public.app_today()                 from public, anon;
revoke execute on function public.my_role()                   from public, anon;
revoke execute on function public.my_status()                 from public, anon;
revoke execute on function public.is_active_staff()           from public, anon;
revoke execute on function public.is_admin()                  from public, anon;
revoke execute on function public.is_menu_open(uuid)          from public, anon;
revoke execute on function public.publish_menu(uuid)          from public, anon;
revoke execute on function public.add_menu_item(uuid,uuid)    from public, anon;
revoke execute on function public.remove_menu_item(uuid,uuid) from public, anon;
revoke execute on function public.lock_menu(uuid)             from public, anon;
revoke execute on function public.set_pick_rules(uuid[])      from public, anon;

-- Signed-in users may call these; each one checks the caller's role itself.
grant execute on function public.app_today()                 to authenticated;
grant execute on function public.my_role()                   to authenticated;
grant execute on function public.my_status()                 to authenticated;
grant execute on function public.is_active_staff()           to authenticated;
grant execute on function public.is_admin()                  to authenticated;
grant execute on function public.is_menu_open(uuid)          to authenticated;
grant execute on function public.publish_menu(uuid)          to authenticated;
grant execute on function public.add_menu_item(uuid,uuid)    to authenticated;
grant execute on function public.remove_menu_item(uuid,uuid) to authenticated;
grant execute on function public.lock_menu(uuid)             to authenticated;
grant execute on function public.set_pick_rules(uuid[])      to authenticated;
