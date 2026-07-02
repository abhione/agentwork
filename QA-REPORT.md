# AgentWork QA Report — v7 Regression Pass

**Target:** https://agentwork.fly.dev (v7: public landing, `/marketplace` move, Supabase auth, new pricing, design overhaul)
**Date:** 2026-07-01 (18:11–18:35 PDT)
**Tester:** Automated QA — browser-harness (CDP, Chrome 149, managed browser :18800) + curl + node data validation + pixelshot
**Screenshots:** `/tmp/agentwork-qa2/` (login, signup→marketplace, wrong-pw, profile, interview, team, hire dialog, mobile ×4)
**Test account:** `qa2+agentwork@test.local` (password in `/tmp/agentwork-qa2-pw.txt`, chmod 600)

---

## Summary

| Metric | Result |
|---|---|
| Criteria tested | 47 |
| ✅ PASS | 45 |
| ⚠️ GAP / N-A | 2 (tier-filter pills absent; local Box Claws happy path untestable on fly) |
| ❌ FAIL | 0 |
| P0/P1 bugs | **0** |
| P2 bugs | 0 |
| P3 nits | 5 (1 fixed in this pass) |
| Console errors | **None** (landing, login, marketplace, interview, team, mobile) |
| `next build` | ✅ passes locally (post-fix) |

## Verdict: **SHIP WITH NITS**

Everything on the must-cover list passes. Auth gating is airtight, new pricing is exact and stale prices are fully scrubbed (verified across landing + all 26 profile pages), streaming chat works, mobile holds at 390px with zero horizontal scroll. The nits are cosmetic/informational — none block release.

---

## 0. Public landing page (`/`) — unauthenticated

| Criterion | Status | Evidence |
|---|---|---|
| `/` → HTTP 200 without auth | ✅ PASS | curl: `HTTP/2 200`, no redirect |
| Hero "Hire AI employees that actually do the work" + Browse talent CTA → `/login?next=%2Fmarketplace` | ✅ PASS | Headline in DOM; 11 CTA links all point to `/login?next=%2Fmarketplace` |
| 6 preview cards (Sage, Nova, Atlas, Iris, Cipher, Indigo) with name/emoji/role/rating/skills/rate | ✅ PASS | All 6 present in rendered HTML; rates $3.00/$1.50/$2.25/$1.00/$1.50/$2.25 match each agent's tier |
| No interview/hire actions reachable from landing | ✅ PASS | href scan: **zero** `/interview/`, `/talent/`, `/team` links on landing. Only `/login?next=…`, `#how-it-works`, `#pricing`. Preview cards show "Sign in to interview" gate |
| Pricing section — EXACT rates $1.00 / $1.50 / $2.25 / $3.00 | ✅ PASS | `#pricing` section text: "Haiku … $1.00/hr … Sonnet … $1.50/hr … Opus … $2.25/hr … Fable … $3.00/hr" — all four tiers with feature lists, "Most hired" badge on Sonnet, "Flagship" on Fable |
| How-it-works (Browse → Interview → Hire → Manage) + value trio | ✅ PASS | All four step words + section render; value cards ("Pay by the hour, fire in one click", etc.) present |
| Footer renders, links work | ✅ PASS | Footer with Product (How it works, Pricing, Browse talent) + Account (Sign in, Create account) columns; all hrefs resolve (`/#how-it-works`, `/#pricing`, `/login…`) |
| Zero stale prices ($0.02/$0.05/$0.20/$0.35 "/hr") | ✅ PASS | Regex scan of rendered HTML: 0 occurrences |
| Mobile 390px: renders, no horizontal scroll | ✅ PASS | CDP device emulation 390×844: `scrollWidth === 390`, overflow false. Visual check (3 screenshots: top/mid/bottom): hero, preview card, value cards, testimonials, CTA, footer all render cleanly |

**Note on pixelshot:** initial pixelshot run at 390px captured mostly-black tiles — the landing's entrance animations (`animate-fade-up` + `<Reveal>` with a 2.5s failsafe) hadn't fired at capture time (~0.6s). Not a user-facing bug (real browser render verified fine via harness), but fast screenshotters/link-unfurlers will see a dark page. See Nit N5.

## 1. Auth — Supabase email/password

| Criterion | Status | Evidence |
|---|---|---|
| Unauth `/marketplace` → 307 `/login` | ✅ PASS | curl: `307`, `location: /login` (no `?next` — intentional, default post-login target is /marketplace) |
| Unauth `/talent/nova-sdr` → 307 `/login?next=%2Ftalent%2Fnova-sdr` | ✅ PASS | Exact match |
| Unauth `/team` → 307 `/login?next=%2Fteam` | ✅ PASS | Exact match |
| Unauth `/interview/nova-sdr` → 307 `/login?next=%2Finterview%2Fnova-sdr` | ✅ PASS | Exact match |
| Unauth `POST /api/chat` → 401 JSON | ✅ PASS | `401` + `{"error":"Unauthorized"}` + `content-type: application/json` |
| Unauth `/boxapi/*` → 401 | ✅ PASS | `/boxapi/boxes` → 401 |
| Sign UP via real UI | ✅ PASS | browser-harness: toggled Sign up, filled email/pw/confirm, submitted → **landed directly on /marketplace signed in**. Header shows `qa2+agentwork@test.local` + Log out. Note: no email confirmation was required (Supabase confirm-email appears disabled — see N4) |
| Wrong password → friendly error, no crash | ✅ PASS | Submitted wrong pw → inline `role=alert`: **"Invalid email or password."** — stayed on /login, no crash |
| Signed-in `/login` → redirect /marketplace | ✅ PASS | Middleware redirect confirmed in-browser |
| `?next=` respected after login | ✅ PASS | Signed in from `/login?next=%2Ftalent%2Fsage-strategist` → landed on that exact profile |
| Open-redirect defense (`?next=//evil.com`) | ✅ PASS | Landed on `/marketplace` at `agentwork.fly.dev` — protocol-relative URL rejected (both client + middleware validate) |
| Header shows email; logout re-gates | ✅ PASS | Email visible in header; Log out → `/login`; subsequent `/marketplace` → redirected to `/login` again |

## 2. Marketplace (`/marketplace`) — authed

| Criterion | Status | Evidence |
|---|---|---|
| Hero renders | ✅ PASS | "Hire AI agents that work like employees" + "From $1.00/hr — transparent hourly compute" |
| **26** talent cards with full fields | ✅ PASS | 26 interview links, "26 agents found"; cards show avatar, name, role, rating (count), jobs, rate, skill chips, availability, Interview + View Profile |
| Rates on cards from TIER_RATES only | ✅ PASS | Unique rate strings on page: `$1.00/hr, $1.50/hr, $2.25/hr, $3.00/hr` — nothing else |
| Category filters | ✅ PASS | Engineering → "5 agents found"; All → 26. All 10 category pills present |
| Tier filter pills (fable → 3 agents) | ⚠️ GAP | **No tier filter exists on the marketplace** — filters are category + availability + search only (confirmed in `app/marketplace/page.tsx`). Data layer verified instead: exactly 3 fable agents (sage-strategist, atlas-architect, lyra-dealmaker). See N2 |
| Availability filters | ✅ PASS | Available now → 17; Any availability → 26 |
| Search by name/role/skill | ✅ PASS | "outreach" → 2; "SQL" → 2; count label updates each time (incl. singular/plural handling) |
| View Profile / Interview navigation | ✅ PASS | Links correct on all cards; navigations verified |
| Mobile 390px | ✅ PASS | `scrollWidth === 390`, 26 cards render stacked; screenshot verified |

## 3. Talent profile (`/talent/[id]`) — authed

Tested `sage-strategist` (fable flagship).

| Criterion | Status | Evidence |
|---|---|---|
| Name, role, bio, rating, reviews, skills, work history | ✅ PASS | All sections render (Sage Okafor, Chief of Staff, reviews, work history, skills) |
| Rate = NEW pricing for tier | ✅ PASS | **$3.00/hr** on fable profile; "Fable" tier label shown; no stale rates on page |
| **All 26 profiles** free of stale prices | ✅ PASS | In-browser authed fetch of every `/talent/[id]`: 26 pages scanned, **0** matches for `$0.02/$0.05/$0.20/$0.35 /hr` |
| Interview button → `/interview/[id]` | ✅ PASS | Link present + correct |
| Hire button opens dialog | ✅ PASS | Dialog: "Hire Sage Okafor … Fable (flagship) $3.00/hr" + graceful Box Claws-offline notice. Closed with Escape — **no deploy performed** |
| Invalid id → not-found, no crash | ✅ PASS | `/talent/does-not-exist` → styled 404 ("This page could not be found"), nav intact |

## 4. Interview chat (`/interview/[id]`) — authed

| Criterion | Status | Evidence |
|---|---|---|
| Chat UI loads with persona intro | ✅ PASS | Intro + suggested prompts + composer render for sage-strategist |
| Streaming AI response (fable talent) | ✅ PASS | Sent "In one sentence, what do you do?" → streaming began <2s, full reply ~15s |
| In-character | ✅ PASS | Reply: *"I turn founder chaos into ranked decisions — … one-page memo with the call, the tradeoffs, and what happens next. What's currently eating most of your bandwidth?"* — pure chief-of-staff persona, ends with a question back |
| Hire CTA visible | ✅ PASS | Hire button in interview header |
| Bogus talentId → clean JSON error | ✅ PASS | Authed `POST /api/chat {talentId:"bogus-id"}` → `404 {"error":"Talent not found"}` |

## 5. Your Team (`/team`) — authed

| Criterion | Status | Evidence |
|---|---|---|
| Loads without crash | ✅ PASS | "Your Team" renders; no error boundary |
| Graceful Box Claws-offline state | ✅ PASS | Friendly offline banner (not a hard error) |
| Hire path from team page | ✅ PASS | "Hire More Talent" button present (navigates to marketplace); hire *dialog* verified from talent profile instead — opens/closes cleanly, no deploy |
| `/team/nonexistent-box` graceful | ✅ PASS | "Employee not found — This agent may have been terminated, or the Box Claws API is offline" + back link |
| Local-dev Box Claws happy path | ⚠️ N/A | Not testable against fly (intentionally offline there) |

## 6. Cross-cutting

| Criterion | Status | Evidence |
|---|---|---|
| robots.txt = `Disallow: /` | ✅ PASS | Exact body: `User-agent: *` / `Disallow: /` |
| `X-Robots-Tag: noindex, nofollow, noarchive` on every response | ✅ PASS | Present on `/`, `/login`, `/marketplace` (redirect), `/robots.txt`, 404s — every response checked |
| No console errors (landing/login/marketplace/interview/team/mobile) | ✅ PASS | `console.error` + `onerror` + `unhandledrejection` hooks: zero entries everywhere |
| All 26 talents valid; rates match TIER_RATES | ✅ PASS | Node script over `lib/talents.ts`: 26 talents, all 23 required fields non-empty, unique ids, ratings sane, `hourlyRate === TIER_RATES[tier]` for all. `TIER_RATES = {haiku:1, sonnet:1.5, opus:2.25, fable:3}`. Tier mix: 13 sonnet / 6 opus / 4 haiku / 3 fable |
| Header/footer nav crawl | ✅ PASS | Landing: only login/anchor links (all resolve). Authed header: `/marketplace`, `/team` — both 200. Footer anchors scroll correctly |
| `/` while authed | ✅ PASS (documented) | Shows the public landing (200) with the **authed** header (email + Find Talent/Your Team) — sensible; "Browse talent" CTA goes to `/login?next=…`, which middleware bounces straight to `/marketplace` for a signed-in user, so no dead end |
| Unauth unknown route behavior | ✅ PASS (documented) | `/this-route-does-not-exist` unauth → 307 to `/login?next=…` (middleware gates before 404); authed → styled 404. Acceptable |
| `next build` passes locally | ✅ PASS | Compiled successfully; 9/9 pages generated (re-verified after the N1 copy fix) |

---

## Bugs & nits

**P0/P1/P2: none.**

| # | Sev | Issue | Status |
|---|---|---|---|
| N1 | P3 | Landing hero interview mock labeled Sage Okafor "**Strategy Consultant**" but her actual role in `lib/talents.ts` is "**Chief of Staff**" ($3.00/hr fable). Inconsistent with her profile/marketplace card. | **FIXED** in this pass — one-line copy change in `app/page.tsx` (line ~141). Build re-verified. Uncommitted; parent to review/deploy |
| N2 | P3 | **No tier filter pills on /marketplace.** The QA brief expected "fable filter → 3 agents", but the UI only has category/availability/search filters. Either add tier pills or drop the criterion. Data confirms 3 fable agents exist | Documented — parent decision |
| N3 | P3 | **Duplicate talent names:** two "Sage Okafor" (sage-writer/sonnet, sage-strategist/fable) and two "Atlas Reyes" (atlas-researcher/opus, atlas-architect/fable). Different roles/emojis so it works, but landing testimonials attributed "on Sage Okafor …" are ambiguous, and it reads like a data bug | Documented — consider renaming two of them |
| N4 | P3 | **Signup requires no email confirmation** — fresh signup got an instant session (Supabase "Confirm email" appears off). Fine for a demo; enable confirmation before this holds anything real. Also means anyone can self-serve an account into the "private" app | Documented — product decision |
| N5 | P3 | **Entrance animations hide content from fast screenshotters** — pixelshot captured black tiles at ~0.6s because `animate-fade-up`/`<Reveal>` content isn't visible until animations/failsafe (2.5s) fire. No effect on real users; affects link unfurlers/SEO snapshots (moot given noindex) | Documented |
| N6 | P3 | *(carryover)* Prod copy references `localhost:3457` in Box Claws-offline messages on /team + hire dialog — confusing on fly | Documented previously; unchanged |
| N7 | P3 | *(carryover)* `/team/[id]` returns HTTP 200 for missing boxes (graceful UI, but 404 would be more correct) | Documented previously; unchanged |

## Files touched by QA (uncommitted, for parent review)

- `QA-ACCEPTANCE.md` — rewritten for v7 reality (landing, /marketplace, Supabase auth, new pricing)
- `QA-REPORT.md` — this report
- `app/page.tsx` — N1 fix: "Strategy Consultant" → "Chief of Staff" (trivial copy)

## Verdict

**SHIP WITH NITS** — zero functional failures across 45 passing criteria; the 5 open nits are cosmetic/product-polish items that don't block release.

---

> **Previous run (2026-07-01 15:33–15:40 PDT):** pre-v7 pass against the old shared-password build with marketplace at `/`, 23 agents, and $0.02–$0.35 rates — 23/23 testable criteria passed, verdict "Ship-ready". That run's criteria are obsolete post-overhaul; this report supersedes it entirely.
