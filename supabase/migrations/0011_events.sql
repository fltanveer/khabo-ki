-- Khabo Ki? — party announcements and cost sharing
--
-- Any employee can announce an arrangement. Sometimes it is a treat and no
-- money changes hands; sometimes there is a bill to split. Everyone who is in
-- gets a share, and anyone can override their own share upward (or down to
-- zero) — the rest of the split reflows around them.

create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  created_by       uuid not null references public.profiles(id) on delete cascade,
  collector_id     uuid not null references public.profiles(id) on delete cascade,
  title            text not null check (length(btrim(title)) between 2 and 120),
  details          text check (details is null or length(details) <= 2000),
  event_at         timestamptz not null,
  cost_mode        text not null default 'treat' check (cost_mode in ('treat', 'shared')),
  total_amount_bdt int check (total_amount_bdt is null or total_amount_bdt > 0),
  status           text not null default 'announced'
                   check (status in ('announced', 'settled', 'cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint events_amount_matches_mode check (
    (cost_mode = 'treat'  and total_amount_bdt is null)
    or (cost_mode = 'shared' and total_amount_bdt is not null)
  )
);

create index if not exists events_upcoming_idx on public.events (event_at desc);

create table if not exists public.event_participants (
  event_id          uuid not null references public.events(id) on delete cascade,
  employee_id       uuid not null references public.profiles(id) on delete cascade,
  rsvp              text not null default 'pending' check (rsvp in ('pending', 'in', 'out')),
  -- Set only when someone opts off the even split: paying more, or nothing.
  custom_amount_bdt int check (custom_amount_bdt is null or custom_amount_bdt >= 0),
  responded_at      timestamptz,
  primary key (event_id, employee_id)
);

-- Everyone active is invited the moment an event is announced, so the office
-- sees it without anyone maintaining a guest list. The announcer is in by
-- default — they are the one arranging it.
create or replace function public.seed_event_participants() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_participants (event_id, employee_id, rsvp, responded_at)
  select new.id, p.id,
         case when p.id = new.created_by then 'in' else 'pending' end,
         case when p.id = new.created_by then now() else null end
  from public.profiles p
  where p.status = 'active'
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists events_seed_participants on public.events;
create trigger events_seed_participants after insert on public.events
  for each row execute function public.seed_event_participants();

create or replace function public.touch_event() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_event();

-- ------------------------------------------------------------- the split
-- Whoever names their own amount is taken out of the pot first; what is left
-- divides among everyone else. The division rarely comes out even, and the
-- leftover taka has to land on somebody or the collector is quietly short
-- every time — it goes to the first payer by id, deterministically.
create or replace view public.event_shares with (security_invoker = true) as
with agg as (
  select e.id as event_id,
         e.total_amount_bdt,
         count(*) filter (where p.rsvp = 'in')                                  as in_count,
         count(*) filter (where p.rsvp = 'in' and p.custom_amount_bdt is not null) as custom_count,
         coalesce(sum(p.custom_amount_bdt) filter
                  (where p.rsvp = 'in' and p.custom_amount_bdt is not null), 0)  as custom_total
  from public.events e
  left join public.event_participants p on p.event_id = e.id
  where e.cost_mode = 'shared' and e.status <> 'cancelled'
  group by e.id, e.total_amount_bdt
),
calc as (
  select a.*,
         greatest(a.total_amount_bdt - a.custom_total, 0) as remaining,
         (a.in_count - a.custom_count)                    as payer_count
  from agg a
),
split as (
  select c.*,
         case when c.payer_count > 0 then c.remaining / c.payer_count else 0 end as base_share,
         case when c.payer_count > 0 then c.remaining % c.payer_count else 0 end as remainder
  from calc c
),
ranked as (
  select p.event_id, p.employee_id,
         row_number() over (partition by p.event_id order by p.employee_id) as rn
  from public.event_participants p
  where p.rsvp = 'in' and p.custom_amount_bdt is null
)
select ep.event_id,
       ep.employee_id,
       case
         when ep.rsvp <> 'in'                    then 0
         when ep.custom_amount_bdt is not null   then ep.custom_amount_bdt
         else s.base_share + case when r.rn = 1 then s.remainder else 0 end
       end as share_bdt
from public.event_participants ep
join split s        on s.event_id = ep.event_id
left join ranked r  on r.event_id = ep.event_id and r.employee_id = ep.employee_id;

-- ---------------------------------------------------------------- policies
alter table public.events             enable row level security;
alter table public.event_participants enable row level security;

drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (public.my_status() = 'active');

drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (events.created_by = auth.uid() and public.my_status() = 'active');

-- The announcer keeps control of their own announcement; an admin can step in
-- to fix or pull down a bad one.
drop policy if exists events_update on public.events;
create policy events_update on public.events for update to authenticated
  using (events.created_by = auth.uid() or public.is_admin())
  with check (events.created_by = auth.uid() or public.is_admin());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete to authenticated
  using (events.created_by = auth.uid() or public.is_admin());

drop policy if exists participants_select on public.event_participants;
create policy participants_select on public.event_participants for select to authenticated
  using (public.my_status() = 'active');

-- Only ever your own row: your RSVP, your amount. Nobody signs anyone else up
-- or edits what somebody else agreed to put in.
drop policy if exists participants_update_own on public.event_participants;
create policy participants_update_own on public.event_participants for update to authenticated
  using (event_participants.employee_id = auth.uid())
  with check (event_participants.employee_id = auth.uid());

drop policy if exists participants_admin on public.event_participants;
create policy participants_admin on public.event_participants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
