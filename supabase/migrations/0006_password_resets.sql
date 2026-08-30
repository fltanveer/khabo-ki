-- Khabo Ki? — password resets
--
-- No email, no SMS. The person asks from the sign-in screen, an admin sees the
-- request and approves it, and approval mints a six digit code the admin reads
-- out to them. The code is what proves the person at the keyboard is the one
-- who asked — without it, anyone who knew a colleague's phone number could sit
-- on the reset page and take the account the moment an admin approved.

create table if not exists public.password_resets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'used', 'denied')),
  code         text,
  attempts     int  not null default 0,
  requested_at timestamptz not null default now(),
  approved_at  timestamptz,
  approved_by  uuid references public.profiles(id),
  expires_at   timestamptz,
  resolved_at  timestamptz
);

-- One live request per person: asking twice reuses the open row instead of
-- filling the admin's list with duplicates.
create unique index if not exists password_resets_one_open
  on public.password_resets (user_id)
  where status in ('pending', 'approved');

create index if not exists password_resets_queue
  on public.password_resets (status, requested_at desc);

alter table public.password_resets enable row level security;

-- Only admins touch these rows directly. The request comes in through a
-- security-definer function because the person asking is signed out, and the
-- password change itself happens in the `users` edge function.
drop policy if exists password_resets_admin on public.password_resets;
create policy password_resets_admin on public.password_resets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ request
create or replace function public.request_password_reset(p_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  select id into v_user
    from public.profiles
   where phone = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
     and status = 'active';

  -- Returns quietly either way. A signed-out stranger must not be able to
  -- probe this for which phone numbers have accounts.
  if v_user is null then
    return;
  end if;

  insert into public.password_resets (user_id) values (v_user)
  on conflict do nothing;
end $$;

-- ------------------------------------------------------------------ approve
create or replace function public.approve_password_reset(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'only an admin can approve a password reset';
  end if;

  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');

  update public.password_resets
     set status      = 'approved',
         code        = v_code,
         attempts    = 0,
         approved_at = now(),
         approved_by = auth.uid(),
         expires_at  = now() + interval '2 hours'
   where id = p_id
     and status in ('pending', 'approved');

  if not found then
    raise exception 'that request is no longer open';
  end if;

  return v_code;
end $$;

-- --------------------------------------------------------------------- deny
create or replace function public.deny_password_reset(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only an admin can deny a password reset';
  end if;

  update public.password_resets
     set status = 'denied', code = null, resolved_at = now()
   where id = p_id
     and status in ('pending', 'approved');
end $$;

-- Postgres grants EXECUTE to PUBLIC by default, which would put these on the
-- REST RPC endpoint for anyone. Strip that, then hand back only what is needed.
revoke all on function public.request_password_reset(text) from public;
revoke all on function public.approve_password_reset(uuid) from public;
revoke all on function public.deny_password_reset(uuid)    from public;

grant execute on function public.request_password_reset(text) to anon, authenticated;
grant execute on function public.approve_password_reset(uuid) to authenticated;
grant execute on function public.deny_password_reset(uuid)    to authenticated;
