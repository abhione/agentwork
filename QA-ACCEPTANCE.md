# AgentWork QA Acceptance Criteria

Target: https://agentwork.fly.dev
Updated: 2026-07-01 (v7 — public landing, /marketplace move, Supabase auth, new pricing)

## 0. Public Landing Page (/) — unauthenticated

- [ ] `/` loads WITHOUT authentication (HTTP 200, no redirect to /login)
- [ ] Hero headline "Hire AI employees that actually do the work" + "Browse talent" CTA → /login?next=/marketplace
- [ ] 6 preview talent cards render (name, emoji, role, rating, skills, rate) with a sign-in gate — NO interview/hire actions reachable from landing
- [ ] Pricing section shows EXACT tier rates: Haiku **$1.00/hr** · Sonnet **$1.50/hr** · Opus **$2.25/hr** · Fable **$3.00/hr**
- [ ] How-it-works (Browse → Interview → Hire → Manage) and value-prop sections render
- [ ] Footer renders with working links (no dead hrefs)
- [ ] No horizontal scroll at 390px viewport (visual check)
- [ ] Zero occurrences of stale prices ($0.02 / $0.05 / $0.20 / $0.35 "/hr") anywhere on the page

## 1. Auth — Supabase email/password

- [ ] Unauthenticated `/marketplace` → 307 redirect to `/login` (no ?next needed for default)
- [ ] Unauthenticated `/talent/[id]`, `/team`, `/interview/[id]` → 307 to `/login?next=<original path>`
- [ ] Unauthenticated `POST /api/chat` → 401 JSON `{"error":"Unauthorized"}`
- [ ] Unauthenticated `/boxapi/*` → 401
- [ ] Sign UP via UI: fresh email + password creates account (or shows "check your email" if confirmation enabled) and lands in /marketplace
- [ ] Sign IN with wrong password → friendly inline error ("Invalid email or password."), no crash
- [ ] Signed-in user hitting `/login` → redirected to /marketplace
- [ ] Header shows the signed-in user's email; Logout works and re-gates /marketplace
- [ ] `?next=` is respected after login and rejects protocol-relative/external URLs (`//evil.com`)

## 2. Marketplace (/marketplace) — authed

- [ ] Page loads with marketplace hero
- [ ] **26** agent talent cards render with: avatar, name, role, rating, job count, rate, skills, availability
- [ ] Category filters work (All, Sales, Research, Writing, Recruiting, Customer Success, Operations, Engineering, Marketing, Executive Support)
- [ ] Tier filter works — **fable filter → 3 agents** (if tier pills present)
- [ ] Availability filters work (Any, Available now, Limited)
- [ ] Search filters by name/role/skill (e.g. "outreach", "SQL")
- [ ] Agent count label updates when filtering
- [ ] "View Profile" → /talent/[id]; "Interview" → /interview/[id]
- [ ] All rendered rates come from TIER_RATES ($1.00/$1.50/$2.25/$3.00) — no stale prices

## 3. Talent Profile (/talent/[id]) — authed

- [ ] Profile renders: name, role, bio, rating, reviews, skills, work history
- [ ] Rate matches NEW pricing for the tier (e.g. a fable profile shows $3.00/hr)
- [ ] Model tier displayed
- [ ] "Interview" button → /interview/[id]
- [ ] "Hire" button opens hire dialog (do not deploy)
- [ ] Invalid talent id → not-found state (no crash)

## 4. Interview Chat (/interview/[id]) — authed

- [ ] Chat UI loads with agent persona intro
- [ ] Sending a message returns a streaming AI response (one short message only — costs money)
- [ ] Response is in-character
- [ ] "Hire" CTA visible during chat
- [ ] `POST /api/chat` with bogus talentId → clean JSON error, no stack trace

## 5. Your Team (/team) — authed

- [ ] Page loads without crash
- [ ] When Box Claws API unreachable (fly), graceful empty/offline state — NOT a hard error
- [ ] Hire dialog opens from team page (no actual deploy)
- [ ] /team/[nonexistent] → graceful "employee not found"

## 6. Cross-cutting / non-functional

- [ ] robots.txt = `Disallow: /`
- [ ] `X-Robots-Tag: noindex` header on every response including `/`
- [ ] No console errors on landing, login, marketplace
- [ ] All 26 talents in lib/talents.ts have valid required fields; hourlyRate matches TIER_RATES for their tier
- [ ] Header/footer nav links all resolve (no 404s from crawl)
- [ ] `/` while authed → documented sensible behavior (landing or redirect)
- [ ] 404 route handled with styled page
- [ ] Mobile 390px: landing + marketplace render without horizontal scroll
- [ ] `next build` passes locally
