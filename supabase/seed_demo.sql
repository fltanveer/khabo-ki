-- Demo accounts and a starter item library.
-- Creates auth users directly, which is why it disables the privilege guard
-- for one statement: seeding runs as postgres, not as a signed-in admin.
do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select * from (values
      ('01700000001', 'Tanvir (Admin)',   'admin',    'KhaboAdmin123'),
      ('01700000002', 'Shila (Staff)',    'staff',    'KhaboStaff123'),
      ('01700000003', 'Rakib (Employee)', 'employee', 'KhaboEmp123')
    ) as t(phone, name, role, password)
  loop
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_id, 'authenticated', 'authenticated',
      r.phone || '@khaboki.local',
      extensions.crypt(r.password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', r.name, 'phone', r.phone, 'role', r.role),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', r.phone || '@khaboki.local', 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;

alter table public.profiles disable trigger profiles_guard_privileges;
update public.profiles set status = 'active', approved_at = now() where status = 'pending';
alter table public.profiles enable trigger profiles_guard_privileges;

insert into public.items (name)
values ('Rice'), ('Fish curry'), ('Chicken curry'), ('Egg curry'),
       ('Beef bhuna'), ('Mixed vegetables'), ('Dal'), ('Khichuri')
on conflict do nothing;
