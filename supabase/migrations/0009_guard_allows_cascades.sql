-- Khabo Ki? — let internal cascades through the profile guard
--
-- Deleting a person sets approved_by to null on everyone they approved, which
-- is an UPDATE on profiles, which fires guard_profile_privileges(). That runs
-- with no session, so is_admin() is NULL, the admin branch is skipped, and the
-- guard raises — aborting the whole delete with
-- "only an admin can change role, status or approval".
--
-- A null auth.uid() means the service role or an internal cascade. Every
-- policy on profiles is `to authenticated` and keyed on auth.uid(), so RLS
-- already blocks every unprivileged path in that state; there is nobody left
-- for this trigger to stop.

create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;

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
