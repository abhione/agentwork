# AgentWork Unit Economics

**Date:** July 2026 · **Status:** Adopted — `TIER_RATES` in `lib/talents.ts` reflects this analysis.

## TL;DR

The old rates (haiku $0.02 · sonnet $0.05 · opus $0.20 · fable $0.35 per hour) were pure
compute-pass-through fantasy — they lost money on **every single billed hour** by 10–20x.
New rates: **haiku $1.00 · sonnet $1.50 · opus $2.25 · fable $3.00 per hour.** Every tier is
gross-margin positive in the MID consumption scenario with prompt caching enabled; the HIGH
scenario is covered by breakeven-utilization analysis and idle-time non-billing.

---

## 1. Input costs

### Anthropic API pricing (July 2026, per million tokens)

| Model | Input | Output | Cached input read | Cache write (5m) |
|---|---|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 | $1.25 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 | $3.75 |
| Claude Opus 4.5 | $5.00 | $25.00 | $0.50 | $6.25 |
| Claude Fable 5 | $10.00 | $50.00 | $1.00 | $12.50 |

Fable 5 pricing **verified via web search** (finout.io, requesty.ai, openrouter.ai, anthropic.com):
$10/$50 per Mtok — the brief's working assumption of $10/$40 undershot output cost by 25%,
which matters a lot since output dominates cached-agent economics. US-only inference adds a
1.1x multiplier; we assume standard routing.

### Token consumption per active agent-hour

Agents run tool loops: read task → call tool → re-read context → repeat. Input tokens dominate
because the growing context is re-sent every turn, but with prompt caching most of that re-read
is billed at 10% of list price.

| Scenario | Input tok/hr | Output tok/hr | Represents |
|---|---|---|---|
| LOW | 200k | 20k | Light monitoring, ticket triage, short loops |
| MID | 400k | 40k | Typical working agent (planning + tools + reports) |
| HIGH | 600k | 60k | Heavy loops: large-context research, codebase review |

### Effective input price with caching

Agent loops are the ideal caching workload: ~90% of each turn's input is a cache hit (system
prompt + conversation prefix), ~10% is new content written to cache at 1.25x.

> Blended input multiplier = 0.90 × 0.10 + 0.10 × 1.25 = **0.215x** list input price.

We use 0.215x for "cached" numbers below. Without caching (multiplier 1.0x) is shown as the
worst case — the platform enforces caching in the runtime, so uncached is a bug, not a plan.

### Infra overhead per billed hour

| Item | $/hr | Note |
|---|---|---|
| Box Claws container (default) | $0.020 | Docker on our Fly hosts |
| Fly.io amortized (app + bandwidth) | $0.010 | Spread across concurrent agents |
| **Default infra total** | **$0.030** | used in margin tables |
| E2B sandbox (optional runtime) | $0.050 | replaces Box Claws line when selected (+$0.03/hr vs default) |

---

## 2. Cost per active agent-hour

**With prompt caching (expected operating mode), incl. $0.03 infra:**

| Tier | LOW | MID | HIGH |
|---|---|---|---|
| Haiku | $0.17 | $0.32 | $0.46 |
| Sonnet | $0.46 | $0.89 | $1.32 |
| Opus | $0.75 | $1.46 | $2.18 |
| Fable | $1.46 | $2.89 | $4.32 |

**Without caching (worst case / caching regression), incl. $0.03 infra:**

| Tier | LOW | MID | HIGH |
|---|---|---|---|
| Haiku | $0.33 | $0.63 | $0.93 |
| Sonnet | $0.93 | $1.83 | $2.73 |
| Opus | $1.53 | $3.03 | $4.53 |
| Fable | $3.03 | $6.03 | $9.03 |

The uncached table is why caching is a **hard runtime requirement**, not an optimization:
uncached Sonnet MID alone ($1.83) exceeds its $1.50 price.

---

## 3. New pricing and margins

### Adopted rates

| Tier | Old rate | **New rate** | Positioning |
|---|---|---|---|
| Haiku | $0.02/hr | **$1.00/hr** | Fast, high-volume: support, community, bookkeeping |
| Sonnet | $0.05/hr | **$1.50/hr** | The workhorse: sales, writing, ops, QA |
| Opus | $0.20/hr | **$2.25/hr** | Frontier reasoning: research, data, security, legal ops |
| Fable | $0.35/hr | **$3.00/hr** | Flagship: strategy, architecture, enterprise deals |

Still a screaming deal vs. the human equivalent ($25–150/hr) — the story is "an employee for
the price of a vending-machine snack," not "pennies."

### Gross margin per billed hour (cached, $0.03 infra)

| Tier | Price | LOW cost → margin | MID cost → margin | HIGH cost → margin |
|---|---|---|---|---|
| Haiku | $1.00 | $0.17 → **+$0.83 (83%)** | $0.32 → **+$0.68 (68%)** | $0.46 → **+$0.54 (54%)** |
| Sonnet | $1.50 | $0.46 → **+$1.04 (69%)** | $0.89 → **+$0.61 (41%)** | $1.32 → **+$0.18 (12%)** |
| Opus | $2.25 | $0.75 → **+$1.50 (67%)** | $1.46 → **+$0.79 (35%)** | $2.18 → **+$0.07 (3%)** |
| Fable | $3.00 | $1.46 → **+$1.54 (51%)** | $2.89 → **+$0.11 (4%)** | $4.32 → **−$1.32 (−44%)** |

✅ **Every tier is gross-margin positive in MID.** Fable's MID margin is deliberately thin (4%) —
it's the halo tier and $3.00 is the ceiling of the mandated price band; see levers below for how
it improves in practice.

### Breakeven utilization — HIGH scenario

An agent bills wall-clock hours while hired, but only burns tokens while *actively working*.
Breakeven utilization = the max fraction of a billed hour an agent can run at HIGH burn before
we lose money:

| Tier | HIGH cost/active-hr | Breakeven utilization at list price |
|---|---|---|
| Haiku | $0.46 | >100% (profitable even at continuous HIGH burn) |
| Sonnet | $1.32 | >100% (profitable at continuous HIGH burn) |
| Opus | $2.18 | ~103% — effectively breakeven at continuous HIGH burn |
| Fable | $4.32 | **69%** — must idle/think ≥31% of billed time at HIGH burn |

Real agents don't sustain HIGH burn for full billed hours — they wait on tools, humans, and
scheduled work. Observed utilization in interviews/pilots is 40–70% active, which keeps even
Fable positive. Runtime enforcement: per-agent hourly token budgets with soft-degrade (agent
pauses and reports rather than silently burning past budget).

---

## 4. Margin levers (in rough order of impact)

1. **Prompt caching (implemented assumption)** — 90% discount on cache reads. Already the
   difference between −$3/hr and +$0.11/hr on Fable MID. Enforced in the agent runtime.
2. **Idle-time non-billing / metered activity** — we bill hired hours; tokens only flow during
   active work. Every idle minute is pure margin. Future: bill "active hours" explicitly as a
   trust feature ("fire in one click, pay only when they work").
3. **Batch API (−50%)** — non-interactive work (overnight research, report generation, log
   triage) routed through the Batch API halves API cost for those workloads.
4. **Output-token discipline** — output is 5x input price. Personas already instruct concision;
   runtime caps `max_tokens` per turn. A 25% output reduction adds ~$0.50/hr margin on Fable.
5. **Tier routing** — sub-tasks inside a loop (summarization, tool-arg extraction) route to
   Haiku regardless of the agent's headline tier. Cuts Opus/Fable burn 10–20%.
6. **1h cache TTL for long-running agents** — fewer cache re-writes on slow loops.
7. **Volume/committed-use discounts** — not modeled; upside at scale.

## 5. What changed in code

- `lib/talents.ts` → `TIER_RATES` updated to `{ haiku: 1.00, sonnet: 1.50, opus: 2.25, fable: 3.00 }`.
  All profile cards, hire dialog, interview header, team dashboard, and the interview system
  prompt derive from `TIER_RATES`/`hourlyRate`, so they update automatically.
- Stale copy scrubbed: "From $0.02/hr compute" (marketplace hero), "cost pennies per hour"
  (marketplace hero + interview system prompt in `app/api/chat/route.ts`), README rate table,
  QA docs. Hardcoded `?? 0.05` fallback in `app/team/[id]/page.tsx` → `?? 1.5`.
- Historical `earnings` figures in work-history data were left as-is (they're period artifacts
  of past engagements, not current rates).
