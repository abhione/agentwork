# AgentWork Infrastructure

## Accounts & Services

### Supabase

| Property | Value |
|----------|-------|
| **Project** | `agentwork` |
| **Reference ID** | `sebsnowworhrqqyschao` |
| **Region** | West US (North California) |
| **Organization** | `firebird` (`uoasujbjzyzlehmulrjw`) |
| **Created** | 2026-07-01 |
| **Dashboard** | https://supabase.com/dashboard/project/sebsnowworhrqqyschao |

**Account Details:**
- **Email:** `abhi@sequoiatalent.com`
- **Username:** `abhione`
- **Auth:** Supabase CLI token in macOS Keychain ("Supabase CLI")

> ⚠️ Note: The GitHub-linked Supabase account (`abhi@sequoiadigital.io` / `abhirupbhattacharya-sequoia`) does **NOT** have access to this project. Use the `abhione` account above.

### Fly.io

| Property | Value |
|----------|-------|
| **App** | `agentwork` |
| **URL** | https://agentwork.fly.dev |
| **Organization** | `personal` |
| **Status** | deployed |

**Secrets Configured:**
- `ANTHROPIC_API_KEY` - For agent interviews & chat
- `BOXCLAWS_URL` - Box Claws API endpoint
- `ADMIN_EMAIL` - Admin notifications
- `NEXT_PUBLIC_APP_URL` - https://agentwork.fly.dev
- `NEXT_PUBLIC_SUPABASE_URL` - https://sebsnowworhrqqyschao.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for admin ops
- `RESEND_API_KEY` - Email sending

### Box Claws (Agent Runtime)

| Property | Value |
|----------|-------|
| **App** | `agentwork-boxes` |
| **Local Port** | 3457 |
| **Source** | `~/Developer/agentbox-openclaw` |

Box Claws provides the isolated container runtime for deployed agents.

## Admin Access

### Application Login

- **URL:** https://agentwork.fly.dev/login
- **Email:** `abhi@sequoiadigital.io`
- **Password:** `AgentWork2026!` (reset 2026-07-04)

### Admin Panel

- **URL:** https://agentwork.fly.dev/admin/users
- Requires user in `admin_users` table

### Supabase Dashboard Access

**Option 1: CLI (Recommended)**
```bash
# Already authenticated via keychain
supabase projects list
supabase db remote commit --project-ref sebsnowworhrqqyschao
```

**Option 2: Browser**
1. Go to https://supabase.com/dashboard
2. Click "Continue with GitHub"
3. Login to GitHub as `abhione` (NOT `abhirupbhattacharya-sequoia`)
4. Select "firebird" organization → "agentwork" project

> ⚠️ **Important:** The `abhione` GitHub account is linked to `abhi@sequoiatalent.com` Supabase.
> The `abhirupbhattacharya-sequoia` GitHub account is linked to a different Supabase account that does NOT have access to agentwork.
> If you accidentally login with the wrong GitHub account, you'll see "You do not have access to this project".

## All Supabase Projects (firebird org)

| Project | Ref ID | Created |
|---------|--------|---------|
| lastgramalpha | `qpicnhtteaoxgrxvipdf` | 2025-04-27 |
| prosource | `ntfqnyrmjsqjbtqsrept` | 2025-06-25 |
| emberpath | `vutsjhdryrzabjcbdzyj` | 2025-09-19 |
| edge | `ecaunbzxhmvwhknzgnzo` | 2025-09-15 |
| lastgram-beta | `ssbvbdrtskmjxtpwzfyo` | 2025-09-14 |
| pulsecheck | `bndimbcmnbxcmbsblvha` | 2026-03-03 |
| zerodegrees | `ttyfkzzlfgxqwngllrjj` | 2026-02-23 |
| **agentwork** | `sebsnowworhrqqyschao` | 2026-07-01 |

## Local Development

```bash
cd ~/Developer/agentwork
pnpm install
pnpm dev  # → http://localhost:3900
```

### Requirements

1. Copy `.env.local` with Supabase vars (already configured)
2. Anthropic API key at `~/.openclaw/credentials/anthropic-key`
3. Box Claws running for hiring/team features:
   ```bash
   cd ~/Developer/agentbox-openclaw && ./start.sh
   ```

## Application Users (Supabase Auth)

| Email | Type | Created |
|-------|------|---------|
| `abhi@sequoiadigital.io` | Admin | 2026-07-02 |
| `abhirup@mac.com` | User | 2026-07-02 |
| qa/probe accounts | Test | 2026-07-01/02 |

## Quick Commands

```bash
# Deploy to Fly
fly deploy -a agentwork

# View logs
fly logs -a agentwork

# Check secrets
fly secrets list -a agentwork

# Supabase SQL
supabase db remote exec --project-ref sebsnowworhrqqyschao "SELECT * FROM admin_users;"

# List auth users
curl -s "https://sebsnowworhrqqyschao.supabase.co/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" | jq '.users[].email'
```

## Related Repos

- `~/Developer/agentwork` - Main application
- `~/Developer/agentbox-openclaw` - Box Claws runtime (for agent containers)
- `~/Developer/agentbox-src` - Original agentbox source
