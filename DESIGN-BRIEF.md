# DESIGN-BRIEF.md — Landing Page Design Pass

**For:** design agent (next in pipeline)
**Scope:** `app/page.tsx` (new public landing page) + light header polish in `app/layout.tsx`
**Do not touch:** auth flow, middleware, `noindex` headers/robots.txt, TIER_RATES, copy claims
(pricing numbers and value-prop facts are locked — restyle, don't rewrite).

## What was built (growth pass, functional-first)

New public landing at `/`; the authed marketplace moved to `/marketplace`. Sections top-to-bottom:

1. **Hero** — badge pill ("26 agents on the bench"), H1 with gradient `logo-text` span
   ("Hire AI employees that **actually do the work**"), subhead, primary CTA
   `Browse talent → /login?next=/marketplace`, secondary `How it works → #how-it-works`,
   trust microcopy line. Background: single radial emerald glow at top center.
2. **Meet the talent** — 6 preview cards (curated across tiers: Fable flagship Sage Okafor,
   sonnet Nova, opus Atlas, haiku Iris, sonnet Cipher, opus Indigo). Cards reuse marketplace
   card anatomy (avatar, name, rate, role, stars, tagline, skill chips) + a full-card hover
   overlay ("Sign in to interview") and a tier/lock footer row.
3. **Value trio** — 3 cards on `bg-secondary/20` band: Interview before you hire /
   Watch them work (VNC) / Pay by the hour, fire in one click.
4. **How it works** (`#how-it-works`) — 4 step cards: Browse → Interview → Hire → Manage.
5. **Pricing** (`#pricing`) — 4 tier cards; Sonnet is `featured` ("Most hired" pill).
   Rates come from `TIER_RATES` — never hardcode.
6. **Bottom CTA** + minimal **footer** (anchor links + sign in).

Header (`app/layout.tsx`) is now auth-aware: signed-out shows How it works / Pricing anchors +
emerald "Sign in" button; signed-in shows the original Find Talent / Your Team / Logout nav.

## Design system in place

- Tailwind v4 `@theme` in `app/globals.css` — near-black oklch background, emerald primary
  (`oklch(0.696 0.17 162.48)`), `--radius: 0.5rem`.
- shadcn/ui: Card, Badge, Button (+ Input/Dialog/Select elsewhere). Icons: lucide-react.
- Existing utilities: `logo-text` (emerald gradient text), `animate-fade-up`, `animate-pulse-ring`.
- Shared components: `TalentAvatar` (emoji on hashed gradient tile), `RatingStars`,
  `AvailabilityBadge`.

## What the design pass should improve (deliberately left rough)

1. **Hero visual weight.** Right now it's type-only + one radial gradient. It wants a visual
   anchor: a stylized product mock (marketplace grid or interview chat), an animated agent-card
   collage, or a subtle grid/particle texture. Keep first paint fast; no heavy libs.
2. **Section rhythm.** Bands alternate via `bg-secondary/20` only. Consider more deliberate
   separators (gradient hairlines, tilted dividers, or spacing scale) so scroll has tempo.
3. **Preview card hover.** The full-card blur overlay is functional but blunt — a slide-up
   footer CTA or spotlight border would feel more premium. Overlay must remain keyboard-
   focusable (it's the card's only link).
4. **How-it-works connectivity.** Four disconnected cards; a connecting line/arrow motif or
   numbered progress rail would sell the sequence. Currently plain `Step n` labels.
5. **Pricing card hierarchy.** The featured (Sonnet) treatment is minimal. Fable could carry a
   subtle "flagship" flourish (gradient border?). Keep the receipt-like honesty vibe.
6. **Scroll animations.** Only `animate-fade-up` on preview cards (mount-time, not
   scroll-triggered). IntersectionObserver-based reveals would help; keep it CSS-first.
7. **Social proof.** Review pull-quotes exist in `lib/talents.ts` (`TALENTS[n].reviews`) —
   a testimonial strip between value trio and how-it-works is a natural add. Fictional-client
   names are fine (whole marketplace is a demo), just don't invent new claims.
8. **Footer** is intentionally skeletal.

## Constraints / gotchas

- **Mobile:** baseline is responsive (stacks at 390px, no horizontal scroll) — preserve that.
  Hero H1 is `text-4xl sm:text-6xl`; watch wrap on long words.
- **Dark theme only** (`html.dark` hardcoded). No light-mode work needed.
- **noindex must survive** — do not remove the `X-Robots-Tag` header (next.config.js), the
  `robots` metadata (layout.tsx), or public/robots.txt.
- Landing page is a **server component** (no "use client") — keep it that way if possible;
  isolate any interactive flourish into small client components.
- Anchor links (`/#how-it-works`, `/#pricing`) are referenced from the header — keep those ids.
- All rates render from `TIER_RATES` / `talent.hourlyRate` via `formatRate` — never hardcode $.
- Build gate: `./node_modules/.bin/next build` must pass; smoke on a port ≥3902.
