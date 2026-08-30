-- Khabo Ki? — payment records and monthly meal settlement
--
-- Money moves outside the app: cash in hand, or a bKash/Nagad transfer against
-- someone's QR. There is no gateway here and no attempt to fake one. What the
-- app does is keep the record straight — who owes what, who says they paid,
-- and who confirms it landed.

-- ------------------------------------------------------- where to send money
-- Kept out of `profiles` on purpose: a QR image is tens of kilobytes and
-- profiles is read on nearly every request.
create table if not exists public.payment_details (
  employee_id uuid primary key references public.profiles(id) on delete cascade,
  provider    text check (provider in ('bkash', 'nagad', 'rocket', 'other')),
  number      text check (number is null or length(btrim(number)) between 6 and 20),
  -- A downscaled data: URL of the QR the collector screenshots from their own
  -- wallet app. A bKash QR encodes their merchant payload — one generated from
  -- a phone number would not scan, so it has to be their real image.
  qr_image    text check (qr_image is null or length(qr_image) <= 400000),
  updated_at  timestamptz not null default now()
);

alter table public.payment_details enable row level security;

drop policy if exists payment_details_select on public.payment_details;
create policy payment_details_select on public.payment_details for select to authenticated
  using (public.my_status() = 'active');

drop policy if exists payment_details_own on public.payment_details;
create policy payment_details_own on public.payment_details for all to authenticated
  using (payment_details.employee_id = auth.uid())
  with check (payment_details.employee_id = auth.uid());

drop policy if exists payment_details_admin on public.payment_details;
create policy payment_details_admin on public.payment_details for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ payments
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  payer_id     uuid not null references public.profiles(id) on delete cascade,
  payee_id     uuid not null references public.profiles(id) on delete cascade,
  amount_bdt   int  not null check (amount_bdt > 0),
  method       text not null check (method in ('cash', 'qr')),
  -- Exactly one of these: a month of lunches, or one event.
  event_id     uuid references public.events(id) on delete cascade,
  meal_month   date,
  note         text check (note is null or length(note) <= 200),
  claimed_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  constraint payments_one_target check (
    (event_id is not null and meal_month is null)
    or (event_id is null and meal_month is not null)
  ),
  constraint payments_month_is_first check (
    meal_month is null or extract(day from meal_month) = 1
  )
);

create index if not exists payments_payer_idx on public.payments (payer_id, claimed_at desc);
create index if not exists payments_event_idx on public.payments (event_id);
create index if not exists payments_month_idx on public.payments (meal_month);

-- Lunch money goes to the office, and the office means an admin. Without this
-- an employee could file a meal payment against a friend and mark the month
-- clear between them.
create or replace function public.check_payment_payee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.meal_month is not null then
    if not exists (select 1 from public.profiles p
                   where p.id = new.payee_id and p.role = 'admin') then
      raise exception 'monthly meal money is paid to an admin';
    end if;
  end if;

  if new.payer_id = new.payee_id then
    raise exception 'a payment needs two different people';
  end if;

  return new;
end $$;

drop trigger if exists payments_check_payee on public.payments;
create trigger payments_check_payee before insert or update on public.payments
  for each row execute function public.check_payment_payee();

alter table public.payments enable row level security;

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (
    payments.payer_id = auth.uid()
    or payments.payee_id = auth.uid()
    or public.is_admin()
  );

-- You may file your own claim, never pre-confirmed. Confirming is the other
-- side's job — a one-tap self-declaration is worth nothing the first time
-- there is a disagreement about whether the money arrived.
drop policy if exists payments_claim_own on public.payments;
create policy payments_claim_own on public.payments for insert to authenticated
  with check (
    payments.payer_id = auth.uid()
    and public.my_status() = 'active'
    and payments.confirmed_at is null
    and payments.confirmed_by is null
  );

drop policy if exists payments_confirm on public.payments;
create policy payments_confirm on public.payments for update to authenticated
  using (payments.payee_id = auth.uid())
  with check (payments.payee_id = auth.uid());

drop policy if exists payments_withdraw_own on public.payments;
create policy payments_withdraw_own on public.payments for delete to authenticated
  using (payments.payer_id = auth.uid() and payments.confirmed_at is null);

drop policy if exists payments_admin on public.payments;
create policy payments_admin on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------- monthly bills
-- Own meals and guest meals, priced at whatever they cost on the day.
create or replace view public.meal_bills with (security_invoker = true) as
select employee_id,
       month,
       sum(own_meals)::int   as own_meals,
       sum(guest_meals)::int as guest_meals,
       sum(amount_bdt)::int  as amount_bdt
from (
  select o.employee_id,
         date_trunc('month', m.menu_date::timestamp)::date as month,
         count(*)                as own_meals,
         0                       as guest_meals,
         sum(o.unit_price_bdt)   as amount_bdt
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
