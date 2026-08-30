-- Khabo Ki? — a name directory employees can actually read
--
-- profiles_select only lets you see yourself unless you are staff. That was
-- fine when employees never needed to name anyone else, but parties and
-- payments are about other people: who is collecting, who is going, who to
-- pay. Rather than widening profiles — which would hand every employee
-- everyone's phone number — this exposes just id, name and role.
--
-- Deliberately not security_invoker: the whole point is to read past the
-- profiles policy. The guard is inside instead — only an active user sees
-- anything, and only active people are listed.
create or replace view public.people as
select p.id, p.name, p.role
from public.profiles p
where p.status = 'active'
  and public.my_status() = 'active';

revoke all on public.people from public, anon;
grant select on public.people to authenticated;
