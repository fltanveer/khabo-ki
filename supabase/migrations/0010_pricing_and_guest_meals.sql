-- Khabo Ki? — meal pricing and guest meals

-- ------------------------------------------------------------- app settings
-- One row, forever. The `id` column is a boolean pinned to true so a second
-- row is impossible.
create table if not exists public.app_settings (
  id              boolean primary key default true check (id),
  meal_price_bdt  int not null default 75 check (meal_price_bdt > 0),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles(id) on delete set null
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

create or replace function public.meal_price() returns int
language sql stable security definer set search_path = public as $$
  select meal_price_bdt from public.app_settings where id
$$;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated
  using (public.my_status() = 'active');

drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------ price stamping
-- The price is copied onto the row when the meal is ordered and never looked
-- up again. Changing the office price must not silently rewrite what people
-- were charged in a month they have already settled.
alter table public.orders add column if not exists unit_price_bdt int;
update public.orders set unit_price_bdt = 75 where unit_price_bdt is null;
alter table public.orders alter column unit_price_bdt set not null;

create or replace function public.stamp_meal_price() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.unit_price_bdt is null then
    new.unit_price_bdt := public.meal_price();
  end if;
  return new;
end $$;

-- Nobody rewrites the price on a meal that has already been ordered. Without
-- this an employee could PATCH their own order row to unit_price_bdt = 0 and
-- zero out their bill — the RLS update policy checks who and when, not what.
create or replace function public.freeze_meal_price() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.unit_price_bdt is distinct from old.unit_price_bdt
     and public.is_admin() is not true then
    raise exception 'the price on an existing meal cannot be changed';
  end if;
  return new;
end $$;

drop trigger if exists orders_stamp_price on public.orders;
create trigger orders_stamp_price before insert on public.orders
  for each row execute function public.stamp_meal_price();

drop trigger if exists orders_freeze_price on public.orders;
create trigger orders_freeze_price before update on public.orders
  for each row execute function public.freeze_meal_price();

-- ------------------------------------------------------------- guest meals
-- A guest eats on an employee's tab but picks their own dish, so this cannot
-- be a quantity column on `orders` — that table is keyed one-row-per-employee
-- per day, and auto-picks, bans and preference ranking all rely on it.
create table if not exists public.guest_meals (
  id             uuid primary key default gen_random_uuid(),
  host_id        uuid not null references public.profiles(id) on delete cascade,
  daily_menu_id  uuid not null references public.daily_menus(id) on delete cascade,
  item_id        uuid not null references public.items(id) on delete restrict,
  quantity       int  not null default 1 check (quantity between 1 and 20),
  guest_label    text check (guest_label is null or length(btrim(guest_label)) <= 60),
  unit_price_bdt int  not null,
  created_at     timestamptz not null default now()
);

create index if not exists guest_meals_menu_idx on public.guest_meals (daily_menu_id);
create index if not exists guest_meals_host_idx on public.guest_meals (host_id, created_at desc);

drop trigger if exists guest_meals_stamp_price on public.guest_meals;
create trigger guest_meals_stamp_price before insert on public.guest_meals
  for each row execute function public.stamp_meal_price();

drop trigger if exists guest_meals_freeze_price on public.guest_meals;
create trigger guest_meals_freeze_price before update on public.guest_meals
  for each row execute function public.freeze_meal_price();

alter table public.guest_meals enable row level security;

-- Everyone signed in sees guest meals: the point is that the office knows a
-- guest is coming, and staff need them in the headcount.
drop policy if exists guest_meals_select on public.guest_meals;
create policy guest_meals_select on public.guest_meals for select to authenticated
  using (public.my_status() = 'active');

-- A host seats their own guests, only while the menu is open, only on a dish
-- actually on that menu. Deliberately not filtered by the host's own bans —
-- a guest may eat something the host won't.
drop policy if exists guest_meals_insert_own on public.guest_meals;
create policy guest_meals_insert_own on public.guest_meals for insert to authenticated
  with check (
    guest_meals.host_id = auth.uid()
    and public.my_status() = 'active'
    and public.is_menu_open(guest_meals.daily_menu_id)
    and exists (select 1 from public.daily_menu_items dmi
                where dmi.daily_menu_id = guest_meals.daily_menu_id
                  and dmi.item_id = guest_meals.item_id)
  );

drop policy if exists guest_meals_update_own on public.guest_meals;
create policy guest_meals_update_own on public.guest_meals for update to authenticated
  using (guest_meals.host_id = auth.uid() and public.is_menu_open(guest_meals.daily_menu_id))
  with check (
    guest_meals.host_id = auth.uid()
    and public.is_menu_open(guest_meals.daily_menu_id)
    and exists (select 1 from public.daily_menu_items dmi
                where dmi.daily_menu_id = guest_meals.daily_menu_id
                  and dmi.item_id = guest_meals.item_id)
  );

drop policy if exists guest_meals_delete_own on public.guest_meals;
create policy guest_meals_delete_own on public.guest_meals for delete to authenticated
  using (guest_meals.host_id = auth.uid() and public.is_menu_open(guest_meals.daily_menu_id));

drop policy if exists guest_meals_admin on public.guest_meals;
create policy guest_meals_admin on public.guest_meals for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on function public.meal_price() from public, anon;
grant execute on function public.meal_price() to authenticated;
