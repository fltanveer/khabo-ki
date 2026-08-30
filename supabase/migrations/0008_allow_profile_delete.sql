-- Khabo Ki? — make deleting a person possible
--
-- Deleting an auth.users row cascades into profiles, but four columns point
-- back at profiles with no ON DELETE action, so the cascade hits a foreign key
-- restriction and the whole delete aborts. Anyone who had ever approved a
-- registration, added a dish, published a menu, or touched the audit trail was
-- effectively undeletable. None of these references are worth blocking a
-- delete over — the record stays, it just loses the name attached to it.

alter table public.profiles
  drop constraint if exists profiles_approved_by_fkey,
  add  constraint profiles_approved_by_fkey
       foreign key (approved_by) references public.profiles(id) on delete set null;

alter table public.items
  drop constraint if exists items_created_by_fkey,
  add  constraint items_created_by_fkey
       foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.daily_menus
  drop constraint if exists daily_menus_published_by_fkey,
  add  constraint daily_menus_published_by_fkey
       foreign key (published_by) references public.profiles(id) on delete set null;

alter table public.menu_audit
  drop constraint if exists menu_audit_actor_id_fkey,
  add  constraint menu_audit_actor_id_fkey
       foreign key (actor_id) references public.profiles(id) on delete set null;

alter table public.password_resets
  drop constraint if exists password_resets_approved_by_fkey,
  add  constraint password_resets_approved_by_fkey
       foreign key (approved_by) references public.profiles(id) on delete set null;

-- orders, employee_bans and employee_pick_rules already cascade, so deleting
-- a person takes their order history with them. That is what delete means
-- here; deactivate is the option that keeps the history.
