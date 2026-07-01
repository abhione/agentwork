# AgentWork QA Report

**Target:** https://agentwork.fly.dev
**Date:** 2026-07-01 (15:33–15:40 PDT)
**Tester:** Automated functional QA via browser-harness (CDP, Chrome 149) + curl
**Screenshots:** `/tmp/agentwork-qa/` (13 captures)

---

## Summary

| Metric | Result |
|---|---|
| Criteria tested | 24 |
| ✅ PASS | 23 |
| ⚠️ PARTIAL / N-A | 1 (local-dev Box Claws check — not testable against fly) |
| ❌ FAIL | 0 |
| **Pass rate** | **23/23 testable = 100%** |
| Critical bugs | **None** |
| Console errors on load | **None** (marketplace, profiles, interview, team, mobile) |

**Verdict: Ship-ready.** All functional flows work, error states degrade gracefully, streaming chat is live and in-character, and the mobile layout holds up. Two minor cosmetic observations noted at the bottom (non-blocking).

---

## 1. Marketplace (/)

| Criterion | Status | Evidence |
|---|---|---|
| Hero banner "Hire AI agents that work like employees" | ✅ PASS | Text present in DOM on load. Screenshot: `01-marketplace.png` |
| 23 agent cards with avatar, name, role, rating, jobs, rate, skills, availability | ✅ PASS | Exactly 23 cards (23 `/interview/` links, 46 `/talent/` links = 2 per card). Spot-checked Nova Chen card: emoji avatar 🎯, name, "Sales Development Rep", 4.9 (87), 112 jobs, $0.05/hr, skill chips (Cold Outreach, Prospect Research, Email Sequences, LinkedIn Outreach, +3), "Available now" badge, Interview + View Profile buttons |
| Category filters | ✅ PASS | All 10 category buttons render (All, Sales, Research, Writing, Recruiting, Customer Success, Operations, Engineering, Marketing, Executive Support). Clicked Sales → 1 card / "1 agent found"; Engineering → 4 cards / "4 agents found"; All → 23. Screenshot: `03-filter-sales.png` |
| Availability filters | ✅ PASS | Available now → 16 cards; Limited → 4 cards; Any availability → 23. Counts consistent |
| Search by name/role/skill | ✅ PASS | "outreach" → 2 results (nova-sdr, hunter-recruiter); "SQL" → 2 results. Screenshot: `02-search-outreach.png` |
| Agent count updates when filtering | ✅ PASS | "X agents found" label updated correctly for every filter/search combination tested (23 → 2 → 2 → 1 → 4 → 16 → 4 → 23). Singular/plural handled ("1 agent found") |
| "View Profile" → /talent/[id] | ✅ PASS | Clicked View Profile on Nova card → client-side nav to `/talent/nova-sdr` |
| "Interview" → /interview/[id] | ✅ PASS | Interview links present on all 23 cards with correct hrefs (e.g. `/interview/nova-sdr`); interview page loads (see §3) |

## 2. Talent Profile (/talent/[id])

Tested two profiles: **nova-sdr** (via marketplace click) and **cipher-qa** (direct URL).

| Criterion | Status | Evidence |
|---|---|---|
| Name, role, bio, rating, reviews, skills, work history | ✅ PASS | Both profiles render all sections. Nova: "Top Rated Plus" badge, 4.9 (87 reviews), full About bio, tagline quote. Cipher: 4.8 (44 reviews), Skills list (Manual Testing, Playwright, E2E, …), Work History ("Pre-launch QA sweep — Loopdash · 1 month"). Screenshots: `04-profile-nova.png`, `05-profile-cipher.png` |
| Rate and model tier displayed | ✅ PASS | "$0.05/hr" on both; model tier text present (Sonnet tier shown in hire flow) |
| "Interview" button → /interview/[id] | ✅ PASS | Buttons link to `/interview/nova-sdr` and `/interview/cipher-qa` respectively |
| "Hire" button opens hire flow | ✅ PASS | Clicked "Hire — $0.05/hr" on Cipher profile → dialog opened: "Hire Cipher Wong … deploys Cipher as a live agent in an isolated Box Claws container", Compute selector (Sonnet, balanced, $0.05/hr), plus graceful notice that Box Claws API is unreachable. Screenshot: `06-hire-dialog.png` |
| Invalid talent id → not-found, no crash | ✅ PASS | `/talent/does-not-exist` → HTTP 404, styled Next.js 404 page ("404 — This page could not be found") with site nav intact. No crash, no error boundary. Screenshot: `07-talent-notfound.png` |

## 3. Interview Chat (/interview/[id])

| Criterion | Status | Evidence |
|---|---|---|
| Chat UI loads with agent persona intro | ✅ PASS | `/interview/nova-sdr` shows intro ("Interview Nova — Chat with Nova before hiring…") + 4 suggested prompt chips + textarea input. Screenshot: `08-interview-init.png` |
| Sending a message returns streaming AI response | ✅ PASS | Sent "What's your approach to cold outreach?" via UI. At +1s: "thinking…" indicator; at +13s: full multi-paragraph response rendered progressively. API also verified directly: `POST /api/chat {"talentId":"nova-sdr",...}` returned streamed text within seconds. Screenshot: `09-interview-response.png` |
| Response is in-character | ✅ PASS | Response was authentically SDR-persona: prospect research first, "uncomfortably short" emails, "no 'I hope this finds you well'", ends with a discovery question back to the interviewer. Matches Nova's bio voice |
| "Hire" CTA visible during chat | ✅ PASS | "Hire This Agent" button persistent in interview page header |
| Graceful error if API key missing/invalid | ✅ PASS (by inspection + negative test) | API key is configured on fly (streaming works). Code review of `app/api/chat/route.ts`: missing key → JSON `{error: "No Anthropic API key configured…"}` with proper status; upstream failure → 502 with truncated error. Negative test executed: `POST /api/chat` with `talentId:"bogus-id"` → **404** `{"error":"Talent not found"}` — clean JSON error, no stack trace |

## 4. Your Team (/team)

| Criterion | Status | Evidence |
|---|---|---|
| Page loads without crash | ✅ PASS | HTTP 200, renders header, "Your Team — 0 agents hired · 0 working now", Refresh + Hire More Talent buttons. No console errors. Screenshot: `10-team.png` |
| Graceful offline state when Box Claws unreachable | ✅ PASS | Friendly banner: "Box Claws infrastructure offline — The Box Claws API isn't reachable at localhost:3457. Start it from the agentbox-openclaw repo…" with copy-able start command. No hard error, no error boundary, no blank page |
| Local dev: shows deployed boxes when Box Claws running | ⚠️ N/A | Not testable against the fly deployment (Box Claws is intentionally unreachable there). Offline path fully verified; local-dev happy path untested in this run |

## 5. Employee Dashboard (/team/[id])

| Criterion | Status | Evidence |
|---|---|---|
| Graceful handling when box doesn't exist | ✅ PASS | `/team/nonexistent-box` → HTTP 200, renders "Employee not found — This agent may have been terminated, or the Box Claws API is offline" with "Back to Your Team" link. No crash. Screenshot: `11-employee-nonexistent.png` |

## 6. General

| Criterion | Status | Evidence |
|---|---|---|
| No console errors on marketplace load | ✅ PASS | Injected `window.onerror` + `unhandledrejection` + `console.error` hooks **before** navigation; zero entries captured across marketplace, filtering, profiles, interview chat, team pages, and mobile emulation |
| Dark theme renders correctly | ✅ PASS | `body` background = `oklch(0.145 0 0)` (near-black); all screenshots confirm consistent dark UI with legible contrast |
| Mobile viewport (390px) doesn't break | ✅ PASS | Emulated 390×844 (iPhone-class). `scrollWidth` = 390 → **no horizontal overflow**; all 23 cards render stacked; hero, search, and filters usable. Screenshot: `13-mobile-390.png` |
| 404 route handled | ✅ PASS | `/this-route-does-not-exist` → HTTP 404 with styled not-found page and intact nav. Screenshot: `12-404.png` |

---

## HTTP status matrix

| Route | Status |
|---|---|
| `/` | 200 |
| `/talent/nova-sdr` | 200 |
| `/talent/does-not-exist` | 404 |
| `/interview/nova-sdr` | 200 |
| `/team` | 200 |
| `/team/nonexistent-box` | 200 (soft not-found UI) |
| `/this-route-does-not-exist` | 404 |
| `POST /api/chat` (valid id) | 200, streaming text |
| `POST /api/chat` (bogus id) | 404, `{"error":"Talent not found"}` |

---

## Minor observations (non-blocking, no fix applied)

1. **Prod copy references localhost** — The Box Claws offline messages on `/team` and in the hire dialog say "isn't reachable at **localhost:3457** — start it from the agentbox-openclaw repo / `agentbox dashboard`". Accurate for local dev, but slightly confusing on the public fly deployment where a visitor can't start anything. Cosmetic; consider environment-aware copy.
   *Repro: visit https://agentwork.fly.dev/team → read banner.*
2. **`/team/[id]` returns HTTP 200 for missing boxes** — the UI degrades perfectly ("Employee not found"), but a 404 status would be more semantically correct for crawlers/monitoring. Purely optional.

## Bugs

**None found.** No crashes, no unhandled errors, no broken flows.
