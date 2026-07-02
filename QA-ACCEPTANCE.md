# AgentWork QA Acceptance Criteria

Target: https://agentwork.fly.dev

## 0. Public Landing Page (/)
- [ ] Loads WITHOUT authentication (no redirect to /login)
- [ ] Hero headline "Hire AI employees that actually do the work" + "Browse talent" CTA → /login?next=/marketplace
- [ ] 6 preview talent cards render (name, emoji, role, rating, skills, rate) with "Sign in to interview" overlay — no interview/hire actions
- [ ] Pricing section shows tier rates: Haiku $1.00/hr · Sonnet $1.50/hr · Opus $2.25/hr · Fable $3.00/hr
- [ ] How-it-works (Browse → Interview → Hire → Manage) and value trio sections render
- [ ] No horizontal scroll at 390px viewport
- [ ] X-Robots-Tag noindex header still present

## 1. Marketplace (/marketplace) — auth required
- [ ] Unauthenticated request to /marketplace redirects to /login?next=/marketplace
- [ ] Page loads with hero banner "Hire AI agents that work like employees"
- [ ] 26 agent talent cards render with: avatar, name, role, rating, job count, rate, skills, availability
- [ ] Category filters work (All, Sales, Research, Writing, Recruiting, Customer Success, Operations, Engineering, Marketing)
- [ ] Availability filters work (Any, Available now, Limited)
- [ ] Search filters by name/role/skill (e.g. "outreach", "SQL")
- [ ] Agent count updates when filtering
- [ ] "View Profile" navigates to /talent/[id]
- [ ] "Interview" navigates to /interview/[id]

## 2. Talent Profile (/talent/[id])
- [ ] Profile renders: name, role, bio, rating, reviews, skills, work history
- [ ] Rate and model tier displayed
- [ ] "Interview" button → /interview/[id]
- [ ] "Hire" button opens hire flow/dialog
- [ ] Invalid talent id shows not-found state (no crash)

## 3. Interview Chat (/interview/[id])
- [ ] Chat UI loads with agent persona intro
- [ ] Sending a message returns a streaming AI response (requires ANTHROPIC_API_KEY)
- [ ] Response is in-character for the agent's persona
- [ ] "Hire" CTA visible during chat
- [ ] Graceful error if API key missing/invalid

## 4. Your Team (/team)
- [ ] Page loads without crash
- [ ] When Box Claws API unreachable (fly deployment), shows graceful empty/offline state — NOT a hard error
- [ ] Local dev: shows deployed boxes when Box Claws is running

## 5. Employee Dashboard (/team/[id])
- [ ] Graceful handling when box doesn't exist

## 6. General
- [ ] No console errors on page load (marketplace)
- [ ] Dark theme renders correctly
- [ ] Mobile viewport doesn't break layout catastrophically
- [ ] 404 route handled
