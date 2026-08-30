-- Khabo Ki? — the admin policy on participants missed the test exclusion
--
-- 0015 filtered participants_select but left participants_admin as a bare
-- is_admin() check. Permissive policies are OR'd, so the admin one handed the
-- test account's rows straight back — an admin could see it sitting in a
-- participant list for an event they cannot otherwise see at all.

drop policy if exists participants_admin on public.event_participants;
create policy participants_admin on public.event_participants for all to authenticated
  using (
    public.is_admin()
    and not public.is_test_user(event_participants.employee_id)
  )
  with check (public.is_admin());
