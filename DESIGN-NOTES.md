# DESIGN-NOTES.md — Design Pass Documentation

**By:** design agent · July 2026
**Scope:** full visual pass over landing + app (no logic, routes, pricing, or data changes)

## Design system chosen: Linear (adapted)

From the local `awesome-design-md` library (55 production DESIGN.md files), **linear.app**
was the clear fit for a dark, premium, dev-adjacent marketplace:

- **Dark-mode-native**, not "dark theme applied to light design" — near-black canvas where
  content emerges via luminance hierarchy, not color variation
- Ultra-thin **semi-transparent white borders** (`rgba(255,255,255,0.06–0.08)`) instead of
  solid gray borders — "wireframes drawn in moonlight"
- **Single chromatic accent** used sparingly (Linear uses indigo; we keep AgentWork's emerald)
- Aggressive **negative letter-spacing at display sizes**, relaxing toward normal below 24px
- Multi-layered shadows with **inset top highlights** for depth on dark surfaces

Adaptations: emerald `oklch(0.696 0.17 162.48)` stays as the brand accent; backgrounds get a
whisper of green-cool tint (hue 170) instead of Linear's blue-cool, so the whole canvas
subtly reinforces the brand.

## Typography

- **Display: Space Grotesk** (next/font/google, variable) — geometric grotesk with real
  character; used for h1/h2/section headings and the logotype. Tight tracking at display
  sizes per Linear's compression-at-scale principle.
- **Body: Inter** (variable) with OpenType features `cv02 cv03 cv04 cv11` (already enabled)
  — refined UI text, three-weight system (400 read / 500 UI / 600 strong).
- **Mono: JetBrains Mono** — rates, tier labels, stats, section eyebrows. Monospace for
  "machine data" (prices, uptime, tiers) sells the receipt-like honesty of the pricing story
  and gives the marketplace a technical texture human designers reach for.

All loaded via `next/font` (self-hosted at build, zero CLS, no runtime requests).

## Motion strategy: CSS-first, zero new dependencies

Research (LogRocket, spell.sh, r/reactjs consensus 2025–26): motion/framer-motion is the
right call for complex orchestration, but for entrance reveals + micro-interactions,
IntersectionObserver + CSS transitions is lighter and keeps the landing a **server
component** (the brief's constraint). Chosen approach:

- `components/reveal.tsx` — tiny (~40 line) client wrapper using IntersectionObserver;
  adds `.reveal-visible`, unobserves after firing, respects `prefers-reduced-motion`
- CSS custom-property stagger (`--reveal-delay`) for card grids
- Keyframe utilities in `globals.css`: hero glow drift, fade-up, pulse-ring
- Hover micro-interactions: card lift + border glow, slide-up CTA footer on preview cards,
  button transitions — all CSS transitions on GPU-friendly transform/opacity

No framer-motion/motion dependency → bundle unchanged, first paint fast.

## Color & depth system

- Background `oklch(0.13 0.004 170)` (near-black, green-cool cast)
- Card `oklch(0.165 0.005 170)`, raised surfaces one step lighter
- Borders: `oklch(1 0 0 / 8%)` white-alpha (Linear's signature move)
- Cards carry inset top highlight (`inset 0 1px 0 rgba(255,255,255,0.04)`) + soft drop
- Emerald reserved for: CTAs, rates, active states, status dots, one radial hero glow
- Grid texture (masked CSS gradient lines) in hero for engineering texture

## Files changed

- `app/globals.css` — full token + utility overhaul
- `app/layout.tsx` — fonts, header polish, footer-aware chrome
- `components/reveal.tsx` — NEW scroll-reveal client component
- `components/nav-links.tsx` — NEW client nav with active states
- `app/page.tsx` — landing redesign (hero, testimonials, how-it-works rail, pricing hierarchy, footer)
- `app/marketplace/page.tsx`, `app/talent/[id]/page.tsx`, `app/interview/[id]/page.tsx`,
  `app/team/page.tsx`, `app/team/[id]/page.tsx`, `app/login/page.tsx` — polish passes
- `components/ui/{card,button,badge}.tsx` — refined primitives
- `components/{talent-avatar,hire-dialog}.tsx` — minor polish

## What was deliberately NOT done

- No 3D/WebGL, no Lottie, no animation library (bundle discipline)
- No light mode (dark-only per brief)
- No copy or pricing changes; all rates render from `TIER_RATES`
