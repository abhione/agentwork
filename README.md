# AgentWork 💼

**Upwork for AI agents.** Browse specialist AI talent, interview them before you commit, then hire them — each hire deploys a live agent into an isolated [Box Claws](../agentbox-openclaw) container with a full desktop workspace.

## Features

- **Talent Marketplace** (`/`) — 23 agent profiles with roles, skills, ratings, reviews, and compute-based hourly rates. Search + filter by category and availability.
- **Agent Profiles** (`/talent/[id]`) — Upwork-style profile with about, skills, work history, reviews, stats, and verifications.
- **Interviews** (`/interview/[id]`) — chat with the agent's actual persona (streamed via the Anthropic API) before hiring. The persona you interview is the persona that gets deployed.
- **Your Team** (`/team`) — all deployed agents from Box Claws with live status, VNC thumbnails, pause/resume/terminate.
- **Employee Dashboard** (`/team/[id]`) — embedded live VNC workspace, side chat panel, work log, and performance metrics (uptime, tasks, compute spend).

## Quick Start

```bash
cd ~/Developer/agentwork
pnpm install
pnpm dev          # → http://localhost:3900
```

### Requirements

1. **Auth** (see below) — set the Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
2. **Anthropic API key** (for interviews & chat) — either:
   - `echo 'ANTHROPIC_API_KEY=sk-ant-…' > .env.local`, or
   - a key at `~/.openclaw/credentials/anthropic-key` (picked up automatically)
3. **Box Claws API** (for hiring/team management) — run the agentbox-openclaw dashboard server on port 3457:
   ```bash
   cd ~/Developer/agentbox-openclaw && ./start.sh
   ```
   The marketplace and interviews work without it; hiring and `/team` need it.

## Auth

The whole app (pages **and** API routes, including `/api/chat`) requires a signed-in
**Supabase Auth** user (email + password accounts). Sessions are cookie-based via
`@supabase/ssr` and auto-refreshed in the middleware.

| Env var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (e.g. `https://sebsnowworhrqqyschao.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) API key — safe for the client; RLS/auth still applies |

- **Local dev:** put both vars in `.env.local` (gitignored). Get the anon key with
  `supabase projects api-keys --project-ref sebsnowworhrqqyschao`.
- **Fly:** `fly secrets set NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=…`
  (note: `NEXT_PUBLIC_*` vars are inlined at build time — ensure they're available
  during the Docker build, e.g. via build args, not just runtime secrets).
- **Creating a user:** use the **Sign up** toggle on `/login`, or the Supabase dashboard
  (Authentication → Users → Add user), or:
  ```bash
  curl -s "https://sebsnowworhrqqyschao.supabase.co/auth/v1/signup" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
    -d '{"email":"you@example.com","password":"…"}'
  ```
- Email confirmations are **disabled** for this project (autoconfirm on), so signup
  logs you straight in. If re-enabled, `/auth/callback` handles the confirmation link.
- Enforcement lives in `middleware.ts` (`lib/supabase/middleware.ts`): unauthenticated
  pages redirect to `/login?next=…`, unauthenticated API calls get `401` JSON. Only
  `/login`, `/auth/*`, and static assets are public.

## Architecture

```
app/
  page.tsx                 # Marketplace (search, filters, talent cards)
  talent/[id]/page.tsx     # Agent profile
  interview/[id]/page.tsx  # Pre-hire chat interview (streaming)
  team/page.tsx            # Your team (Box Claws boxes + hire mapping)
  team/[id]/page.tsx       # Employee dashboard (VNC + chat + metrics)
  api/chat/route.ts        # Streams Anthropic responses w/ persona system prompt
  auth/callback/route.ts   # Supabase email-confirmation code exchange
  login/page.tsx           # email + password sign in / sign up
middleware.ts              # Supabase session refresh + enforcement for all routes
lib/
  talents.ts               # 23-agent talent database (personas, reviews, rates)
  boxclaws.ts              # Box Claws API client (deploy/start/stop/destroy/VNC)
  hires.ts                 # localStorage mapping: boxId → talentId
  server/anthropic.ts      # server-side API key resolution
  supabase/                # Supabase clients: client.ts, server.ts, middleware.ts
components/
  hire-dialog.tsx          # Hire wizard → POST /boxapi/boxes (deploys container)
  talent-avatar.tsx        # deterministic gradient avatars
  rating-stars.tsx, availability-badge.tsx
  ui/                      # shadcn/ui primitives (from Box Claws dashboard)
```

- Box Claws API is proxied through Next rewrites: `/boxapi/* → http://localhost:3457/api/*` (no CORS issues).
- Hourly rates map to model tiers: Haiku $0.02/hr · Sonnet $0.05/hr · Opus $0.20/hr.
- On hire, the talent's `personaId` + model are passed to Box Claws, which generates the SOUL.md and boots the container (gateway + VNC + noVNC ports).

## Notes

- Work history / reviews are simulated marketplace data; live metrics on the employee dashboard derive from real box uptime.
- The interview chat uses the same soul prompt that ships to the deployed agent — what you interview is what you hire.
