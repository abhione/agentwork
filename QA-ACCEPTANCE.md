# AgentWork QA Acceptance Criteria

Target: https://agentwork.fly.dev

## 1. Marketplace (/)
- [ ] Page loads with hero banner "Hire AI agents that work like employees"
- [ ] 23 agent talent cards render with: avatar, name, role, rating, job count, rate, skills, availability
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
