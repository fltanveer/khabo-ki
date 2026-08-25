-- Khabo Ki? — helpers, auto-pick, menu lifecycle

-- security definer so RLS policies can read the caller's own role without
-- recursing into the profiles policies that call this
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_status() returns text
language sql stable security definer set search_path = public as $$
  select status from public.profiles where id = auth.uid()
$$;

create or replace function public.is_active_staff() returns boolean
language sql stable as $$
  select public.my_role() in ('staff','admin') and public.my_status() = 'active'
$$;

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select public.my_role() = 'admin' and public.my_status() = 'active'
$$;

-- Ordering is open only while the menu is published, not locked early,
-- and the cutoff has not passed. This is the single source of truth —
-- RLS enforces it, so no cron job is needed to "close" a day.
create or replace function public.is_menu_open(p_menu_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.daily_menus m
    where m.id = p_menu_id
      and m.status = 'published'
      and m.locked_at is null
      and now() < m.cutoff_time
  )
$$;

-- ------------------------------------------------------------- auto-pick
-- Fills an order for every active employee who has no order yet on this menu,
-- using their highest-priority ranked item that is on the menu and not banned.
-- Employees with no match are left alone (they pick manually, or get nothing).
create or replace function public.run_auto_picks(p_menu_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with candidate as (
    select distinct on (r.employee_id) r.employee_id, r.item_id
    from public.employee_pick_rules r
    join public.profiles p
      on p.id = r.employee_id and p.role = 'employee' and p.status = 'active'
    join public.daily_menu_items dmi
      on dmi.daily_menu_id = p_menu_id and dmi.item_id = r.item_id
    where not exists (
            select 1 from public.employee_bans b
            where b.employee_id = r.employee_id and b.item_id = r.item_id)
      and not exists (
            select 1 from public.orders o
            where o.employee_id = r.employee_id and o.daily_menu_id = p_menu_id)
    order by r.employee_id, r.priority_rank
  )
  insert into public.orders (employee_id, daily_menu_id, item_id, source)
  select employee_id, p_menu_id, item_id, 'auto' from candidate
  on conflict (employee_id, daily_menu_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ------------------------------------------------------- menu lifecycle
create or replace function public.publish_menu(p_menu_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_auto integer;
begin
  if not public.is_active_staff() then
    raise exception 'only staff or admin can publish a menu';
  end if;
  if not exists (select 1 from public.daily_menu_items where daily_menu_id = p_menu_id) then
    raise exception 'cannot publish an empty menu';
  end if;

  update public.daily_menus
     set status = 'published', published_by = auth.uid(), published_at = now()
   where id = p_menu_id and status = 'draft';

  if not found then
    raise exception 'menu not found or already published';
  end if;

  v_auto := public.run_auto_picks(p_menu_id);

  insert into public.menu_audit (daily_menu_id, actor_id, action, detail)
  values (p_menu_id, auth.uid(), 'publish', jsonb_build_object('auto_picks', v_auto));

  return v_auto;
end $$;

-- Adding an item after publish re-runs auto-pick: it can only fill employees
-- who still have no order, so it never overwrites a manual choice.
create or replace function public.add_menu_item(p_menu_id uuid, p_item_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_staff() then
    raise exception 'only staff or admin can change a menu';
  end if;

  insert into public.daily_menu_items (daily_menu_id, item_id)
  values (p_menu_id, p_item_id)
  on conflict do nothing;

  insert into public.menu_audit (daily_menu_id, actor_id, action, detail)
  values (p_menu_id, auth.uid(), 'add_item', jsonb_build_object('item_id', p_item_id));

  if exists (select 1 from public.daily_menus
              where id = p_menu_id and status = 'published') then
    perform public.run_auto_picks(p_menu_id);
  end if;
end $$;

-- Removing an item the restaurant is no longer bringing: existing orders for
-- it are dropped, then auto-pick runs again so anyone with a fallback rule is
-- re-seated. Everyone else is reported back so staff can chase them.
create or replace function public.remove_menu_item(p_menu_id uuid, p_item_id uuid)
returns table (orphaned_employee_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_orphans uuid[];
begin
  if not public.is_active_staff() then
    raise exception 'only staff or admin can change a menu';
  end if;

  select coalesce(array_agg(employee_id), '{}')
    into v_orphans
    from public.orders
   where daily_menu_id = p_menu_id and item_id = p_item_id;

  delete from public.orders where daily_menu_id = p_menu_id and item_id = p_item_id;
  delete from public.daily_menu_items
   where daily_menu_id = p_menu_id and item_id = p_item_id;

  perform public.run_auto_picks(p_menu_id);

  insert into public.menu_audit (daily_menu_id, actor_id, action, detail)
  values (p_menu_id, auth.uid(), 'remove_item',
          jsonb_build_object('item_id', p_item_id, 'dropped_orders', v_orphans));

  return query
    select o.employee_id from unnest(v_orphans) as o(employee_id)
    where not exists (
      select 1 from public.orders x
      where x.daily_menu_id = p_menu_id and x.employee_id = o.employee_id);
end $$;

create or replace function public.lock_menu(p_menu_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_staff() then
    raise exception 'only staff or admin can lock a menu';
  end if;
  update public.daily_menus set locked_at = now()
   where id = p_menu_id and locked_at is null;
  insert into public.menu_audit (daily_menu_id, actor_id, action)
  values (p_menu_id, auth.uid(), 'lock');
end $$;

-- Reordering preferences: replace the whole ranked list in one transaction.
create or replace function public.set_pick_rules(p_item_ids uuid[])
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from public.employee_pick_rules where employee_id = auth.uid();
  insert into public.employee_pick_rules (employee_id, item_id, priority_rank)
  select auth.uid(), item_id, ordinality
    from unnest(p_item_ids) with ordinality as t(item_id, ordinality);
end $$;
