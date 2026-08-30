-- Khabo Ki? — test accounts that never touch real numbers
--
-- One account is used for poking at the live site. It has to be able to do
-- everything — order, bring guests, announce a party, record a payment — or
-- there is nothing to test. What it must never do is move a number anyone
-- acts on: the count staff read to the restaurant, the money the office is
-- owed, or the headcount on somebody's real party.
--
-- Enforced here rather than in each page's query. There are already eight
-- places that read orders, and the CSV export is a ninth; a filter left out
-- of any one of them puts a phantom meal on the restaurant order.

alter table public.profiles
  add column if not exists is_test boolean not null default false;

create or replace function public.is_test_user(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_test from public.profiles where id = p_id), false)
$$;

revoke all on function public.is_test_user(uuid) from public, anon;
grant execute on function public.is_test_user(uuid) to authenticated;

-- ------------------------------------------------------------------ orders
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (
    orders.employee_id = auth.uid()
    or (public.is_active_staff() and not public.is_test_user(orders.employee_id))
  );

-- Policies are OR'd together, so the admin policy has to carry the same
-- exclusion or it hands the test rows straight back.
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders for all to authenticated
  using (public.is_admin() and not public.is_test_user(orders.employee_id))
  with check (public.is_admin());

-- ------------------------------------------------------------- guest meals
drop policy if exists guest_meals_select on public.guest_meals;
create policy guest_meals_select on public.guest_meals for select to authenticated
  using (
    public.my_status() = 'active'
    and (guest_meals.host_id = auth.uid() or not public.is_test_user(guest_meals.host_id))
  );

drop policy if exists guest_meals_admin on public.guest_meals;
create policy guest_meals_admin on public.guest_meals for all to authenticated
  using (public.is_admin() and not public.is_test_user(guest_meals.host_id))
  with check (public.is_admin());

-- ------------------------------------------------------------------ events
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (
    public.my_status() = 'active'
    and (events.created_by = auth.uid() or not public.is_test_user(events.created_by))
  );

drop policy if exists participants_select on public.event_participants;
create policy participants_select on public.event_participants for select to authenticated
  using (
    public.my_status() = 'active'
    and (
      event_participants.employee_id = auth.uid()
      or not public.is_test_user(event_participants.employee_id)
    )
  );

-- A test account is not invited to real parties — otherwise it lands in the
-- headcount and takes a slice of a split people actually have to pay.
create or replace function public.seed_event_participants() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_participants (event_id, employee_id, rsvp, responded_at)
  select new.id, p.id,
         case when p.id = new.created_by then 'in' else 'pending' end,
         case when p.id = new.created_by then now() else null end
  from public.profiles p
  where p.status = 'active'
    and (p.id = new.created_by or not p.is_test)
  on conflict do nothing;
  return new;
end $$;

revoke execute on function public.seed_event_participants() from public, anon, authenticated;

-- ---------------------------------------------------------------- payments
drop policy if exists payments_admin on public.payments;
create policy payments_admin on public.payments for all to authenticated
  using (public.is_admin() and not public.is_test_user(payments.payer_id))
  with check (public.is_admin());

-- ------------------------------------------------------------------- views
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

-- Nobody picks a test account as the person collecting their party money, and
-- its name never turns up in a list. It still resolves its own name.
create or replace view public.people as
select p.id, p.name, p.role
from public.profiles p
where p.status = 'active'
  and public.my_status() = 'active'
  and (p.id = auth.uid() or not p.is_test);

revoke all on public.people from public, anon;
grant select on public.people to authenticated;

-- The account this office actually tests with.
update public.profiles set is_test = true where phone = '01700000003';
