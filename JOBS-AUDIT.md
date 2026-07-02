# JOBS-AUDIT.md — Design Review, Steve Jobs Mode

**Reviewer:** design-review agent, channeling the guy who made people cry over corner radii
**Date:** July 2026 · Audited against local prod build on :3904 (desktop 1440 / mobile 390) + full component read

> "Design is not just what it looks like and feels like. Design is how it works."
> Most of this product looks like someone cared. Some of it looks like they went home at 6.

---

## Verdicts

| Page | Verdict | One-liner |
|---|---|---|
| `/` (landing) | **GOOD**, flirting with great | Strong bones, cheap face. The avatars kill it. |
| `/login` | **GOOD** | Quiet, centered, correct. Ship it. |
| `/marketplace` | **GOOD** | Dense, functional, coherent — minor icon/rhythm nits. |
| `/talent/[id]` | **GOOD** | Best authed page. Header card banner is the right instinct. |
| `/interview/[id]` | **GOOD minus** | Functional chat, zero sense of occasion. An interview should feel like a moment. |
| `/team` | **SHIP OF FOOLS** (edges) | Three buttons crammed in a row, an iframe with no chrome, empty state is fine but the card is a control panel, not a teammate. |
| `/team/[id]` | **SHIP OF FOOLS** (edges) | Header is a toolbar salad. Metrics cards are flat default Cards while landing got `surface-card`. Two design systems in one product. |

---

## Violations (before state)

### SEV-1 — The avatars are the cheapest thing on every page
Emoji centered on a hash-picked gradient tile. The hash gradient has **no relationship to tier**
— a $3.00/hr Fable flagship and a $1.00/hr Haiku can get the identical rose-pink tile. The single
most repeated visual element in the product (appears 8+ times per viewport on marketplace) is the
least designed. This is the first thing a user's eye lands on, on every card, and it says
"hackathon." **This one element caps the entire product's perceived quality.**

### SEV-1 — Hero glow reads as a green smear at 1440
The drifting radial glow + grid is fine in concept but at rest it's a big undifferentiated
green blush with visible JPEG-y banding on some panels. No parallax, no depth — one layer
pretending to be atmosphere. Depth comes from layers moving at different speeds.

### SEV-2 — No page transitions anywhere
Every route change is a hard cut. Landing→login→marketplace→profile→interview: four hard cuts
in the core funnel. The product sells "watch AI work live" and can't animate its own navigation.

### SEV-2 — How-it-works rail is a dead line
A static 1px gradient line behind four icons. The brief itself called for "a connecting line/arrow
motif or numbered progress rail would sell the sequence." What shipped is a horizontal rule with
opinions. It should *draw itself* as you scroll — the sequence is the story.

### SEV-2 — `/team/[id]` is under-designed relative to the front door
- Metrics use bare `Card` (flat) while the landing invented `surface-card` (inset highlight +
  ambient shadow). Same product, two finishes.
- Header: back arrow + avatar + name + 3–4 buttons all fighting on one line; on mobile it wraps
  into soup.
- "Work Log" items are dots + text with no rail — a timeline without a line.
- Terminate uses `confirm()` — a native browser dialog inside a product with a Dialog component.
  (Left functionally as-is; out of scope to change UX flow, but noted.)

### SEV-2 — `/team` cards: control panel, not a roster
Three outline buttons of different widths jammed under an iframe. The iframe has no header
chrome, no "LIVE" affordance — it's a raw rectangle. Status dot on avatar is good; everything
below the fold of the card is utilitarian filler.

### SEV-3 — Interview page has no sense of occasion
Empty state is competent (avatar + suggested questions) but the composer is a bare textarea and
the header is the same bar as everywhere else. No entrance moment. Suggested questions look like
form rows.

### SEV-3 — Icon inconsistency (minor but real)
lucide-react v1 (ancient — v1.22 is from the old lucide days) but usage is mostly consistent at
h-4/h-5 with default stroke. Violations: `Sparkles` used both as flagship-marker (10px context)
and suggestion-marker; `Briefcase` logo icon is generic-to-a-fault; mixed 3.5/4/5 sizing within
single button rows on /team.

### SEV-3 — Touch users never see hover CTAs
Landing preview cards hide their only CTA ("Sign in to interview") behind hover. The static
footer row does carry a lock+label so it's discoverable, but on touch the slide-up never appears.
Acceptable compromise; improved discoverability by keeping the visible footer row (unchanged) —
noted as accepted debt.

### SEV-3 — Mobile hero (390px)
H1 wraps well, badge fits, CTAs stack — baseline is genuinely fine. Chat mock is tall but scrolls
naturally. No violation beyond the shared avatar problem.

### What's already right (credit where due)
- Type system (Space Grotesk display / Inter body / JetBrains Mono for machine data) is a real
  decision, consistently applied. Mono-for-prices is the best idea on the page.
- Linear-style white-alpha borders + inset highlights: correct, consistent on landing.
- Pricing section: receipt-honesty concept lands. Flagship gradient border on Fable works.
- Reveal system is tasteful (fires once, respects reduced-motion, has a failsafe).
- Login page: correctly quiet.

---

## Phase 2 — Executed (July 2026)

> Note: the "What Was Fixed" list originally drafted with this audit was aspirational — the
> audit run crashed before implementing anything. This section records what actually shipped.

### 1. Avatars — SEV-1 → fixed (fallback path; portraits blocked by quota)
- Added optional `avatar?: string` to `Talent` and full portrait support in `TalentAvatar`
  (next/image render inside a tier-colored gradient ring, inset top highlight to match
  `surface-card`). Drop a PNG at `public/avatars/{talent-id}.png` + set `avatar` and it renders
  everywhere.
- **Portrait generation could not run**: the configured image provider (Gemini) returned
  HTTP 429 RESOURCE_EXHAUSTED on every attempt across ~20 minutes, including the pro model —
  daily quota exhausted. Per plan, fell back for all 26 agents.
- **The fallback is now designed, not random**: killed the name-hash gradient entirely.
  Every avatar is tier-coded — **slate/silver=haiku · emerald=sonnet · violet=opus ·
  gold=fable** — with a tier gradient ring, deep layered tile, soft tier glow behind the
  emoji, and inner top highlight. Tier = visual identity on every card.
- Updated every render site: landing preview cards + hero chat mock + testimonials,
  marketplace TalentCard, talent profile header, interview header/empty-state/message rows,
  /team cards, /team/[id] header. Boxes with no linked talent get a neutral white-alpha ring.

### 2. Hero depth — SEV-1 → fixed
- Three backdrop planes now move at different rates on scroll: grid texture (fast, −80px),
  primary emerald glow (slow, +60px), secondary emerald+teal glow pair (mid, +120px) — pure
  CSS scroll-driven animation (`animation-timeline: scroll()` behind `@supports`), zero JS,
  static-graceful on non-supporting browsers, disabled under `prefers-reduced-motion`.
- Banding reduced: single 0.13-alpha blob split into three stacked lower-opacity layers
  (0.09/0.06/0.05) with larger blur radii (160/130/110px) and counter-phase drift.

### 3. Page transitions — SEV-2 → fixed
- `app/template.tsx` (server component, remounts per navigation) + `.page-enter` keyframe:
  220ms fade + 6px rise, no layout shift, no lib, reduced-motion disables.

### 4. How-it-works rail draws itself — SEV-2 → fixed
- New `components/progress-rail.tsx` (IntersectionObserver, fires once, 3s failsafe).
  Static white-alpha track stays; an emerald `.rail-fill` scaleX-draws over 1.4s when the
  section enters view, and the four step icons ignite in sequence (staggered `--rail-delay`,
  opacity/scale/glow). Reduced-motion renders the final lit state.

### 5. /team and /team/[id] parity — SEV-2 → fixed
- Metrics cards on /team/[id] now use the `surface-card` finish (via Card) with icon chips
  and a proper label/value stack.
- /team/[id] header rebuilt: back-link row first, then identity block (avatar + name + role
  badges) with actions grouped right; wraps cleanly at 390px (truncation + flex-wrap groups).
- Work Log is a real timeline: left rail + ringed dots + mono timestamps.
- VNC viewers (both pages) get window chrome: header bar with agent name and a pulsing
  LIVE badge (PAUSED when stopped).
- /team card action row rebalanced: Manage is the primary (filled) full-width action,
  Pause/Resume a fixed-width outline secondary, Terminate a compact ghost icon button with
  aria-label. `confirm()` flow untouched per constraints.

### 6. SEV-3s
- Interview sense of occasion: emerald hairline accent across the header, glow ring stage
  behind the empty-state avatar, suggested questions get hover arrow affordance.
- Icon sizing inside /team action rows verified consistent (all 3.5).

### Verification
- `next build` passes clean.
- Prod build on :3905 — `/` 200, `/marketplace` 307 → /login (unauth), `/api/chat` 401.
- Screenshots (pixelshot, desktop 1440 + mobile 390):
  `/tmp/agentwork-shots/desktop/localhost_3905.png.tiles/` and
  `/tmp/agentwork-shots/mobile/localhost_3905.png.tiles/`. Below-fold dark tiles are the
  known reveal/screenshotter artifact.

---

## Remaining Debt (honest list)

1. **0 of 26 agents have generated portraits** — image-gen quota was exhausted for the day.
   The pipeline is fully wired (avatar field + next/image render + tier ring); generating is
   now purely a content task: save PNGs to `public/avatars/{id}.png` and set `avatar` in
   `lib/talents.ts`. Suggested series style: abstract-geometric faceted head/orb, dark bg,
   tier-colored accent light (slate/emerald/violet/gold).
2. `confirm()` for terminate — should be the Dialog component. Functional, ugly, untouched
   (flow change out of scope).
3. lucide-react v1 is old; upgrading majors was out of scope (no new deps / no dep churn).
4. Interview page could stream a typing indicator with character cadence — current spinner is
   serviceable.
5. Marketplace filter pills wrap into 3 rows at 390px — acceptable but a horizontal scroll
   snap row would be tighter.
6. Hover-only slide-up CTA on landing preview cards is still hover-only; the always-visible
   footer row mitigates. True fix is a visible CTA on touch via `@media (hover: none)`.
