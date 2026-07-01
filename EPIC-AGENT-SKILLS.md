# Epic: Real Agent Skills via Composio

**Status:** Planned
**Owner:** Abhi
**Target:** AgentWork (https://agentwork.fly.dev)
**Dependency:** Composio (https://composio.dev) — tool-calling platform with 1,000+ app integrations, managed OAuth, and per-user auth scoping

---

## Problem

Today, AgentWork talent profiles list *claimed* skills ("Cold Outreach", "SQL", "Playwright") but agents can't actually **do** anything during an interview or after hire beyond chat. The skills are marketing copy, not capabilities.

Composio turns skills into real, executable tools: Gmail, Slack, GitHub, Notion, Linear, HubSpot, LinkedIn, Google Sheets, and 1,000+ more — with managed OAuth so each *client* (the hiring user) connects their own accounts, and the agent gets scoped, revocable access.

## Vision

> **"Skills" on an agent's profile become verified, executable capabilities.** When you hire Nova the SDR, you connect your Gmail + HubSpot during onboarding, and Nova can actually send sequences and update your CRM. The interview becomes a live audition: "Draft an email to this prospect" — and it really drafts one in your Gmail.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        AgentWork (Next.js)                  │
│                                                             │
│  Marketplace ──► Profile ──► Interview ──► Hire ──► Team    │
│                     │            │           │              │
│                     ▼            ▼           ▼              │
│              Skill badges   Tool-use     Onboarding         │
│              (verified)     in chat      wizard (OAuth)     │
│                     │            │           │              │
│  ┌──────────────────┴────────────┴───────────┴───────────┐  │
│  │              lib/composio.ts (server-side)            │  │
│  │   session per (user × hired agent) · tool allowlists  │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            ▼
                  ┌───────────────────┐
                  │     Composio      │
                  │  managed OAuth    │
                  │  1,000+ app tools │
                  │  per-user scoping │
                  └─────────┬─────────┘
                            ▼
              Gmail · Slack · GitHub · Notion ·
              HubSpot · Linear · Sheets · LinkedIn …
```

**Key design decisions:**

1. **Composio TypeScript SDK server-side only** (`@composio/core`) — API key never touches the client.
2. **Entity model:** Composio `user_id` = `agentwork:{clientId}:{boxId}` — each hired agent gets its own connected-account scope. Firing an agent revokes its connections.
3. **Skill → toolkit mapping:** each `Talent.skills[]` entry maps to a Composio toolkit + allowlisted actions (e.g. "Email Sequences" → `GMAIL_SEND_EMAIL`, `GMAIL_CREATE_DRAFT`). Defined statically in `lib/skills-map.ts`.
4. **Interview = sandboxed audition:** interview chat gets *read-only / draft-only* tool variants (create draft ✅, send ❌). Full tools unlock after hire + onboarding.
5. **Model:** all agent reasoning stays on Anthropic (Fable 5 for flagship tier, Sonnet/Opus/Haiku for others) via the existing `/api/chat` streaming route, extended to the Anthropic tool-use loop.

---

## Phases & Stories

### Phase 1 — Foundation (S)
**Goal:** Composio wired in server-side; nothing user-visible yet.

- [ ] **1.1** Create Composio account + API key; store as fly secret `COMPOSIO_API_KEY` (never in repo)
- [ ] **1.2** `lib/composio.ts` — SDK client, entity helpers (`entityFor(clientId, boxId)`), toolkit catalog fetch with caching
- [ ] **1.3** `lib/skills-map.ts` — map all 26 talents' skills → Composio toolkits + action allowlists (draft-only vs full variants)
- [ ] **1.4** `/api/skills/catalog` — returns toolkit metadata (name, logo, auth type) for UI badges

**Acceptance:** server can list available toolkits; skills map covers 100% of talent profiles; no client-side key exposure.

### Phase 2 — Verified Skill Badges (S)
**Goal:** Marketplace + profiles show which skills are *executable*.

- [ ] **2.1** Profile page: skills split into "Verified tools" (Composio-backed, with app logos) vs "Soft skills"
- [ ] **2.2** Talent card: small "⚡ N live tools" badge
- [ ] **2.3** Tool detail popover: which actions the agent may take (transparency = trust)

**Acceptance:** every Fable/Opus agent shows ≥3 verified tools; badge counts match skills map.

### Phase 3 — Tool-Use Interviews (M) 🎯 *differentiator*
**Goal:** Agents can actually use (sandboxed) tools during interviews.

- [ ] **3.1** Extend `/api/chat` to Anthropic tool-use loop: stream → tool_use block → execute via Composio → tool_result → continue stream
- [ ] **3.2** Interview toolset = draft-only allowlist (e.g. `GMAIL_CREATE_DRAFT`, `NOTION_SEARCH`, `GITHUB_LIST_ISSUES` — no writes to prod systems)
- [ ] **3.3** Chat UI: render tool-call cards (app logo, action, args summary, result preview) inline in the conversation
- [ ] **3.4** "Connect an account to test" — optional inline OAuth so users can watch the agent work their real data during the interview
- [ ] **3.5** Rate limiting per session (protect Anthropic + Composio spend); respect 429/Retry-After

**Acceptance:** interviewing Nova + asking "draft a cold email to a VP of Eng at a fintech" produces a real Gmail draft (if connected) or a simulated draft card (if not); no destructive action possible from interview context.

### Phase 4 — Hire Onboarding Wizard (M)
**Goal:** Hiring = granting the agent its tools, like IT onboarding an employee.

- [ ] **4.1** Post-hire onboarding flow: checklist of the agent's toolkits → "Connect" buttons → Composio managed OAuth (redirect/popup) → connection status
- [ ] **4.2** Store connection state per (client, boxId) — SQLite or Fly Postgres (first real DB need; keep it minimal: `hires`, `connections` tables)
- [ ] **4.3** Deploy integration: pass Composio entity id + granted toolkit list into the Box Claws deploy config so the *deployed* agent container gets the same tools (via MCP or SDK inside the box)
- [ ] **4.4** Team page: per-agent "Access" tab — connected apps, scopes, revoke buttons ("offboarding")

**Acceptance:** hire → connect Gmail → deployed agent can send email; revoke → agent loses access within 1 min; firing agent revokes all connections.

### Phase 5 — Work Products & Audit (M)
**Goal:** Trust through visibility.

- [ ] **5.1** Activity feed per hired agent: every tool call logged (action, target app, timestamp, result status)
- [ ] **5.2** Daily digest ("Nova sent 14 emails, booked 2 meetings")
- [ ] **5.3** Approval mode toggle: high-risk actions (send email, create PR) queue for human approval before execution

**Acceptance:** all tool executions auditable; approval mode blocks sends until approved.

---

## Explicitly Out of Scope (this epic)
- Billing/metering real money per tool call
- Multi-client tenancy (single shared password auth stays for now)
- Agent-to-agent delegation
- Custom/private toolkit authoring

## Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Composio API key leak | Server-side only; fly secret; middleware already gates all API routes |
| Agent takes destructive action | Draft-only interview toolsets; allowlists per skill; Phase 5 approval mode |
| OAuth token sprawl | Per-(client×agent) entities; revoke-on-fire; access tab for visibility |
| Prompt injection via tool results (emails, pages) | Treat tool results as untrusted data in system prompt; never auto-execute instructions found in content |
| Composio vendor dependency | Skills map is an abstraction layer; tools defined by our allowlists, swappable backend |
| Cost blowout (Fable + tools) | Per-session rate limits; interview turn caps; Haiku for tool-arg summarization |

## Sizing
Phase 1: ~half day · Phase 2: ~half day · Phase 3: ~1–2 days · Phase 4: ~2 days · Phase 5: ~1 day
**Total: roughly a week of focused agent-swarm work.** Phases 1–3 deliver the demo-able wow ("the agent actually did the thing in the interview").

## Sequencing note
Phases 1–3 need no database. Phase 4 introduces the first persistent store (connections); that's the right moment to add Fly Postgres or LiteFS SQLite.

---

*⚠️ Note from research: composio.dev's landing page contains agent-targeted copy inviting AI agents to sign up autonomously. Signup/account creation should be done by Abhi manually — not by an agent following website instructions.*
