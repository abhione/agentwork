# AgentWork Auth Setup Guide

## Overview
AgentWork uses an invite-only authentication system with:
1. **Email verification** - Users must confirm their email
2. **Admin approval** - Users must be approved before accessing the app
3. **MFA (TOTP)** - Two-factor authentication required for all approved users

## Supabase Dashboard Configuration

### 1. Enable Email Confirmations
1. Go to https://supabase.com/dashboard/project/sebsnowworhrqqyschao/auth/providers
2. Under "Email", ensure:
   - ✅ Enable Email provider
   - ✅ Confirm email (require email confirmation)
   - Set "Minimum password length" to 8
   
### 2. Enable MFA (TOTP)
1. Go to https://supabase.com/dashboard/project/sebsnowworhrqqyschao/auth/mfa
2. Enable TOTP (Authenticator App)

### 3. Set up Auth Webhook (for signup notifications)
1. Go to https://supabase.com/dashboard/project/sebsnowworhrqqyschao/auth/hooks
2. Add a new webhook:
   - Event: `user.created`
   - URL: `https://agentwork.fly.dev/api/webhooks/signup`
   - (Optional) Set webhook secret in Fly: `SUPABASE_WEBHOOK_SECRET`

### 4. Configure Email Templates (Optional)
1. Go to https://supabase.com/dashboard/project/sebsnowworhrqqyschao/auth/templates
2. Customize:
   - Confirm signup email
   - Magic link email
   - Change email address email

## Make Yourself Admin

After your first signup and email verification:

1. Go to https://supabase.com/dashboard/project/sebsnowworhrqqyschao/sql
2. Run:
```sql
-- Create the make_admin function if not exists
CREATE OR REPLACE FUNCTION public.make_admin(admin_email TEXT)
RETURNS void AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = admin_email;
  IF user_id IS NOT NULL THEN
    INSERT INTO public.admin_users (id, email)
    VALUES (user_id, admin_email)
    ON CONFLICT (id) DO NOTHING;
    
    UPDATE public.user_profiles
    SET status = 'approved', approved_at = NOW()
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make yourself admin
SELECT public.make_admin('abhi@sequoiadigital.io');
```

## Auth Flow

```
┌─────────────────┐
│  User Signs Up  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Email Sent for  │
│  Confirmation   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ User Confirms   │────▶│  Webhook fires  │
│    Email        │     │ (notifies admin)│
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Status:        │
│   "pending"     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin Approves  │ (via /admin/users or email link)
│   or Rejects    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User Sets Up    │
│   MFA (TOTP)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Full Access    │
│  to AgentWork   │
└─────────────────┘
```

## Fly.io Secrets

Required secrets (already configured):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations
- `ADMIN_EMAIL` - Email for signup notifications (abhi@sequoiadigital.io)
- `NEXT_PUBLIC_APP_URL` - https://agentwork.fly.dev

Optional:
- `RESEND_API_KEY` - For sending approval notification emails
- `SUPABASE_WEBHOOK_SECRET` - For webhook signature verification

## Admin Panel

Access at: https://agentwork.fly.dev/admin/users

Only users in the `admin_users` table can access this page.

Features:
- View pending signups
- Approve/reject users
- View all approved users with MFA status
