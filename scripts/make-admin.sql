-- Run this in Supabase SQL Editor to make a user an admin
-- Replace 'your-email@example.com' with the email address

-- Option 1: If the user already exists in auth.users
SELECT public.make_admin('abhi@sequoiadigital.io');

-- Option 2: Manually insert if the function doesn't exist yet
-- First, get the user ID:
-- SELECT id, email FROM auth.users WHERE email = 'abhi@sequoiadigital.io';

-- Then insert with that ID:
-- INSERT INTO public.admin_users (id, email) VALUES ('USER_ID_HERE', 'abhi@sequoiadigital.io');
-- UPDATE public.user_profiles SET status = 'approved', approved_at = NOW() WHERE email = 'abhi@sequoiadigital.io';
