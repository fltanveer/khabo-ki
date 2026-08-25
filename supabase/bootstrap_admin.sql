-- Bootstrap: there is no admin yet, so nobody can approve anybody.
-- 1. Register normally through /register with the phone you want as admin.
-- 2. Run this in the Supabase SQL editor, with that phone number.
update public.profiles
   set role = 'admin',
       status = 'active',
       approved_at = now()
 where phone = '01842761087';   -- digits only, exactly as typed at registration
