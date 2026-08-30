-- Khabo Ki? — close two holes in 0006's admin guards.
--
-- 1. my_role() returns NULL when there is no session, so is_admin() returns
--    NULL for a signed-out caller. `if not is_admin() then raise` never fires
--    on NULL — the guard was skipped entirely and execution fell through to
--    the UPDATE. RLS treats NULL as false, so the table stayed safe, but these
--    are SECURITY DEFINER functions and bypass RLS. Compare against true.
--
-- 2. 0006 revoked EXECUTE from PUBLIC but not from anon. Supabase's default
--    privileges grant anon EXECUTE on every new function, so approve/deny were
--    on the REST endpoint for anyone holding the anon key.

create or replace function public.approve_password_reset(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if public.is_admin() is not true then
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

create or replace function public.deny_password_reset(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() is not true then
    raise exception 'only an admin can deny a password reset';
  end if;

  update public.password_resets
     set status = 'denied', code = null, resolved_at = now()
   where id = p_id
     and status in ('pending', 'approved');
end $$;

-- Only the request itself is anonymous; approving and denying never are.
revoke execute on function public.approve_password_reset(uuid) from public, anon;
revoke execute on function public.deny_password_reset(uuid)    from public, anon;
revoke execute on function public.request_password_reset(text) from public;

grant execute on function public.approve_password_reset(uuid) to authenticated;
grant execute on function public.deny_password_reset(uuid)    to authenticated;
grant execute on function public.request_password_reset(text) to anon, authenticated;
