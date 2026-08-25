-- Khabo Ki? — row level security

alter table public.profiles            enable row level security;
alter table public.items               enable row level security;
alter table public.daily_menus         enable row level security;
alter table public.daily_menu_items    enable row level security;
alter table public.orders              enable row level security;
alter table public.employee_bans       enable row level security;
alter table public.employee_pick_rules enable row level security;
alter table public.menu_audit          enable row level security;

-- ---------------------------------------------------------------- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_active_staff());

create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- A user editing their own profile must not be able to promote themselves or
-- self-approve; only an admin may move role/status/approval columns.
create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role <> old.role
     or new.status <> old.status
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at then
    raise exception 'only an admin can change role, status or approval';
  end if;
  return new;
end $$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ------------------------------------------------------------------- items
-- Everyone signed in can read the library: employees need item names to set
-- bans and preference rankings.
create policy items_select on public.items for select to authenticated using (true);
create policy items_write  on public.items for all    to authenticated
  using (public.is_active_staff()) with check (public.is_active_staff());

-- ------------------------------------------------------------- daily menus
create policy menus_select on public.daily_menus for select to authenticated
  using (public.is_active_staff() or status = 'published');
create policy menus_write on public.daily_menus for all to authenticated
  using (public.is_active_staff()) with check (public.is_active_staff());

create policy menu_items_select on public.daily_menu_items for select to authenticated
  using (
    public.is_active_staff()
    or exists (select 1 from public.daily_menus m
               where m.id = daily_menu_id and m.status = 'published')
  );
create policy menu_items_write on public.daily_menu_items for all to authenticated
  using (public.is_active_staff()) with check (public.is_active_staff());

-- ------------------------------------------------------------------ orders
create policy orders_select on public.orders for select to authenticated
  using (employee_id = auth.uid() or public.is_active_staff());

-- An employee may only seat themselves, only while the menu is open, only on
-- an item actually on that menu, and never on an item they have banned.
create policy orders_insert_own on public.orders for insert to authenticated
  with check (
    employee_id = auth.uid()
    and source = 'manual'
    and public.my_status() = 'active'
    and public.is_menu_open(daily_menu_id)
    and exists (select 1 from public.daily_menu_items dmi
                where dmi.daily_menu_id = daily_menu_id and dmi.item_id = item_id)
    and not exists (select 1 from public.employee_bans b
                    where b.employee_id = auth.uid() and b.item_id = item_id)
  );

create policy orders_update_own on public.orders for update to authenticated
  using (employee_id = auth.uid() and public.is_menu_open(daily_menu_id))
  with check (
    employee_id = auth.uid()
    and source = 'manual'
    and public.is_menu_open(daily_menu_id)
    and exists (select 1 from public.daily_menu_items dmi
                where dmi.daily_menu_id = daily_menu_id and dmi.item_id = item_id)
    and not exists (select 1 from public.employee_bans b
                    where b.employee_id = auth.uid() and b.item_id = item_id)
  );

create policy orders_delete_own on public.orders for delete to authenticated
  using (employee_id = auth.uid() and public.is_menu_open(daily_menu_id));

create policy orders_admin_all on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------- employee preferences
create policy bans_own on public.employee_bans for all to authenticated
  using (employee_id = auth.uid()) with check (employee_id = auth.uid());
create policy bans_admin_read on public.employee_bans for select to authenticated
  using (public.is_admin());

create policy rules_own on public.employee_pick_rules for all to authenticated
  using (employee_id = auth.uid()) with check (employee_id = auth.uid());
create policy rules_admin_read on public.employee_pick_rules for select to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------- menu audit
create policy audit_select on public.menu_audit for select to authenticated
  using (public.is_active_staff());

-- ------------------------------------------------------------------ grants
grant execute on function public.app_today()             to authenticated;
grant execute on function public.my_role()               to authenticated;
grant execute on function public.my_status()             to authenticated;
grant execute on function public.is_menu_open(uuid)      to authenticated;
grant execute on function public.publish_menu(uuid)      to authenticated;
grant execute on function public.add_menu_item(uuid,uuid)    to authenticated;
grant execute on function public.remove_menu_item(uuid,uuid) to authenticated;
grant execute on function public.lock_menu(uuid)         to authenticated;
grant execute on function public.set_pick_rules(uuid[])  to authenticated;
revoke execute on function public.run_auto_picks(uuid) from authenticated, anon;
