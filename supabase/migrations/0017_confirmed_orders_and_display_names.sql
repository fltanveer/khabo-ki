-- Khabo Ki? — an auto-pick is a suggestion, not an order; plus display names

-- ------------------------------------------------------- confirmed orders
-- Auto-pick used to place a real order the moment a menu was published. If
-- someone then didn't come in, the office had already bought them lunch and
-- billed them for it. It is now a suggestion sitting on their screen: staff
-- count nothing until the employee actually confirms.
alter table public.orders add column if not exists confirmed_at timestamptz;

-- Everything already placed stays counted. Applying the new rule backwards
-- would drop today's numbers after staff may have read them to the restaurant.
update public.orders set confirmed_at = coalesce(confirmed_at, picked_at)
where confirmed_at is null;

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
  -- confirmed_at stays null: this is a suggestion until its owner says so.
  insert into public.orders (employee_id, daily_menu_id, item_id, source, confirmed_at)
  select employee_id, p_menu_id, item_id, 'auto', null from candidate
  on conflict (employee_id, daily_menu_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Staff and admin only ever see confirmed orders. Enforced here so no screen
-- and no export can accidentally count a suggestion as a meal.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (
    orders.employee_id = auth.uid()
    or (
      public.is_active_staff()
      and orders.confirmed_at is not null
      and not public.is_test_user(orders.employee_id)
    )
  );

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders for all to authenticated
  using (
    public.is_admin()
    and orders.confirmed_at is not null
    and not public.is_test_user(orders.employee_id)
  )
  with check (public.is_admin());

-- Confirming is what turns the suggestion into the employee's own choice, so
-- the row becomes a manual pick — which is also what the update policy's
-- source = 'manual' check already requires.
create or replace view public.meal_bills with (security_invoker = true) as
select employee_id,
       month,
       sum(own_meals)::int   as own_meals,
       sum(guest_meals)::int as guest_meals,
       sum(amount_bdt)::int  as amount_bdt
from (
  select o.employee_id,
         date_trunc('month', m.menu_date::timestamp)::date as month,
         count(*)              as own_meals,
         0                     as guest_meals,
         sum(o.unit_price_bdt) as amount_bdt
  from public.orders o
  join public.daily_menus m on m.id = o.daily_menu_id
  where o.confirmed_at is not null
  group by 1, 2
  union all
  select g.host_id,
         date_trunc('month', m.menu_date::timestamp)::date,
         0,
         sum(g.quantity),
         sum(g.quantity * g.unit_price_bdt)
  from public.guest_meals g
  join public.daily_menus m on m.id = g.daily_menu_id
  group by 1, 2
) parts
group by employee_id, month;

-- --------------------------------------------------------- display names
-- Several people share a first name, and staff reading a list of orders
-- cannot tell them apart. Anyone can set the name the rest of the office
-- sees; the registered name stays put underneath for the admin.
alter table public.profiles
  add column if not exists display_name text
  check (display_name is null or length(btrim(display_name)) between 2 and 60);

create or replace view public.people as
select p.id,
       coalesce(nullif(btrim(p.display_name), ''), p.name) as name,
       p.role
from public.profiles p
where p.status = 'active'
  and public.my_status() = 'active'
  and (p.id = auth.uid() or not p.is_test);

revoke all on public.people from public, anon;
grant select on public.people to authenticated;
