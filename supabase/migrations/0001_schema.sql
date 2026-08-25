-- Khabo Ki? — core schema
-- App timezone is fixed; all "today"/cutoff logic derives from it.
create schema if not exists app;

create or replace function app.tz() returns text
language sql immutable as $$ select 'Asia/Dhaka'::text $$;

create or replace function public.app_today() returns date
language sql stable as $$ select (now() at time zone app.tz())::date $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  phone        text not null unique,
  role         text not null default 'employee' check (role in ('admin','staff','employee')),
  status       text not null default 'pending'  check (status in ('pending','active','inactive')),
  approved_by  uuid references public.profiles(id),
  approved_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- Self-registration: auth.users row -> profile. Employees land pending,
-- admin/staff created by an admin are active immediately.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'employee');
begin
  insert into public.profiles (id, name, phone, role, status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'Unnamed'),
    coalesce(nullif(new.raw_user_meta_data->>'phone', ''), split_part(new.email, '@', 1)),
    v_role,
    case when v_role = 'employee' then 'pending' else 'active' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ item library
create table public.items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  is_active  boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
-- one "Fish Curry", not five spellings of it
create unique index items_name_unique on public.items (lower(btrim(name)));

-- ------------------------------------------------------------- daily menus
create table public.daily_menus (
  id           uuid primary key default gen_random_uuid(),
  menu_date    date not null unique,
  cutoff_time  timestamptz not null,
  status       text not null default 'draft' check (status in ('draft','published')),
  locked_at    timestamptz,           -- staff closing ordering early
  published_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

create table public.daily_menu_items (
  id            uuid primary key default gen_random_uuid(),
  daily_menu_id uuid not null references public.daily_menus(id) on delete cascade,
  item_id       uuid not null references public.items(id) on delete restrict,
  added_at      timestamptz not null default now(),
  unique (daily_menu_id, item_id)
);

-- ------------------------------------------------------------------ orders
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.profiles(id) on delete cascade,
  daily_menu_id uuid not null references public.daily_menus(id) on delete cascade,
  item_id       uuid not null references public.items(id) on delete restrict,
  source        text not null check (source in ('manual','auto')),
  picked_at     timestamptz not null default now(),
  unique (employee_id, daily_menu_id)   -- one pick per employee per day
);
create index orders_menu_idx on public.orders (daily_menu_id);
create index orders_employee_idx on public.orders (employee_id, picked_at desc);

-- --------------------------------------------------- employee preferences
create table public.employee_bans (
  employee_id uuid not null references public.profiles(id) on delete cascade,
  item_id     uuid not null references public.items(id) on delete cascade,
  banned_at   timestamptz not null default now(),
  primary key (employee_id, item_id)
);

create table public.employee_pick_rules (
  employee_id   uuid not null references public.profiles(id) on delete cascade,
  item_id       uuid not null references public.items(id) on delete cascade,
  priority_rank int not null check (priority_rank > 0),
  primary key (employee_id, item_id)
);
-- deferrable so a drag-reorder can rewrite ranks inside one transaction
alter table public.employee_pick_rules
  add constraint employee_pick_rules_rank_unique
  unique (employee_id, priority_rank) deferrable initially deferred;

-- ------------------------------------------------------------- audit trail
create table public.menu_audit (
  id            uuid primary key default gen_random_uuid(),
  daily_menu_id uuid references public.daily_menus(id) on delete cascade,
  actor_id      uuid references public.profiles(id),
  action        text not null,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
