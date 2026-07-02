-- Fix 1: admin_users SELECT policy was self-referencing (infinite recursion).
-- Replace with a simple own-row check; admin visibility flows through
-- SECURITY DEFINER helper functions instead.
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
CREATE POLICY "Users can see own admin row" ON public.admin_users
  FOR SELECT USING (id = auth.uid());

-- Fix 2: user_profiles / invite_codes admin policies referenced admin_users
-- directly, which re-enters admin_users RLS. Use SECURITY DEFINER function.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (public.is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;
CREATE POLICY "Admins can update profiles" ON public.user_profiles
  FOR UPDATE USING (public.is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage invite codes" ON public.invite_codes;
CREATE POLICY "Admins can manage invite codes" ON public.invite_codes
  FOR ALL USING (public.is_user_admin(auth.uid()));

-- Fix 3: invite_codes were readable by anon (leaks codes). Restrict to authenticated.
DROP POLICY IF EXISTS "Anyone can check invite codes" ON public.invite_codes;
CREATE POLICY "Authenticated can check invite codes" ON public.invite_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix 4: users could update their own row without column restrictions,
-- letting them set status='approved'. Lock self-updates so status/approval
-- fields cannot change.
DROP POLICY IF EXISTS "Users can update own name" ON public.user_profiles;
CREATE POLICY "Users can update own name" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND status = (SELECT p.status FROM public.user_profiles p WHERE p.id = auth.uid())
    AND approved_by IS NOT DISTINCT FROM (SELECT p.approved_by FROM public.user_profiles p WHERE p.id = auth.uid())
  );

-- Fix 5: make_admin helper (idempotent re-create)
CREATE OR REPLACE FUNCTION public.make_admin(admin_email TEXT)
RETURNS void AS $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = admin_email;
  IF uid IS NOT NULL THEN
    INSERT INTO public.admin_users (id, email)
    VALUES (uid, admin_email)
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.user_profiles
    SET status = 'approved', approved_at = NOW()
    WHERE id = uid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Do not allow regular users to call make_admin
REVOKE EXECUTE ON FUNCTION public.make_admin(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.make_admin(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.make_admin(TEXT) FROM anon;

-- Fix 6: backfill profiles for users created before the trigger existed
INSERT INTO public.user_profiles (id, email, status)
SELECT u.id, u.email, 'pending'
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Seed admin: Abhi's account (created 2026-07-01)
SELECT public.make_admin('abhi@sequoiadigital.io');
