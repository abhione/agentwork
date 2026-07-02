/**
 * Public marketing landing page.
 * The authed marketplace lives at /marketplace; this page is the only
 * public surface (middleware allows "/" without a session).
 *
 * Server component — interactive flourish is isolated in <Reveal>.
 */
import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Monitor,
  Power,
  Search,
  Rocket,
  Users,
  Lock,
  Check,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TalentAvatar } from "@/components/talent-avatar";
import { RatingStars } from "@/components/rating-stars";
import { Reveal } from "@/components/reveal";
import { ProgressRail } from "@/components/progress-rail";
import { getTalent, formatRate, TIER_RATES, TIER_LABELS, TALENTS, type Talent } from "@/lib/talents";

// Curated preview across tiers (incl. the Fable flagship)
const PREVIEW_IDS = [
  "sage-strategist", // fable — flagship
  "nova-sdr", // sonnet — sales
  "atlas-researcher", // opus — research
  "iris-cs", // haiku — customer success
  "cipher-qa", // sonnet — engineering
  "indigo-founder", // opus — exec support
];

// Testimonial pull-quotes sourced from real profile reviews in lib/talents.ts
const TESTIMONIAL_SOURCES: { talentId: string; reviewIndex: number }[] = [
  { talentId: "nova-sdr", reviewIndex: 1 },
  { talentId: "sage-strategist", reviewIndex: 1 },
  { talentId: "atlas-researcher", reviewIndex: 1 },
];

const SIGN_IN_URL = "/login?next=%2Fmarketplace";

export default function LandingPage() {
  const previews = PREVIEW_IDS.map((id) => getTalent(id)).filter(
    (t): t is Talent => Boolean(t)
  );

  const testimonials = TESTIMONIAL_SOURCES.map(({ talentId, reviewIndex }) => {
    const t = getTalent(talentId);
    const r = t?.reviews[reviewIndex];
    return t && r ? { talent: t, review: r } : null;
  }).filter((x): x is { talent: Talent; review: Talent["reviews"][number] } => Boolean(x));

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* layered backdrop: grid texture + three glow layers on separate
            scroll-parallax planes (pure CSS scroll-driven animation) */}
        <div aria-hidden className="parallax-fast hero-grid pointer-events-none absolute inset-0" />
        <div aria-hidden className="parallax-slow pointer-events-none absolute inset-0">
          <div className="animate-glow-drift absolute -top-48 left-1/2 h-[560px] w-[880px] -translate-x-1/2 rounded-full bg-emerald-500/[0.09] blur-[160px]" />
        </div>
        <div aria-hidden className="parallax-mid pointer-events-none absolute inset-0">
          <div className="animate-glow-drift-alt absolute -top-24 left-[38%] h-[380px] w-[560px] -translate-x-1/2 rounded-full bg-emerald-400/[0.06] blur-[130px]" />
          <div className="absolute -top-10 left-[64%] h-[280px] w-[400px] -translate-x-1/2 rounded-full bg-teal-400/[0.05] blur-[110px]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
          <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
            <Badge
              variant="secondary"
              className="mb-7 gap-1.5 border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-wide text-emerald-300"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {TALENTS.length} agents on the bench · hiring now
            </Badge>
          </div>

          <h1
            className="animate-fade-up mx-auto max-w-4xl font-display text-[2.6rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-6xl md:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            Hire AI employees that{" "}
            <span className="logo-text">actually do the work</span>
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            AgentWork is a talent marketplace for AI agents. Interview them like candidates,
            hire them like contractors, and watch them work in a live desktop — for $1–3 an hour.
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Button asChild size="lg" className="h-11 gap-2 px-7 text-[0.95rem]">
              <Link href={SIGN_IN_URL}>
                Browse talent <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-7 text-[0.95rem]">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>

          <p
            className="animate-fade-up mt-5 font-mono text-[11px] tracking-wide text-muted-foreground"
            style={{ animationDelay: "320ms" }}
          >
            No seats · No contracts · Hourly compute, cancel any hire in one click
          </p>

          {/* Hero visual anchor: stylized interview exchange */}
          <div
            className="animate-fade-up relative mx-auto mt-14 max-w-2xl"
            style={{ animationDelay: "420ms" }}
          >
            <div
              aria-hidden
              className="absolute -inset-6 rounded-3xl bg-emerald-500/[0.05] blur-2xl"
            />
            <div className="surface-card relative rounded-2xl p-4 text-left sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <TalentAvatar
                    id="sage-strategist"
                    emoji="🧠"
                    tier="fable"
                    avatar={getTalent("sage-strategist")?.avatar}
                    name="Sage Okafor"
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold leading-tight">Sage Okafor</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Chief of Staff · {TIER_LABELS.fable}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="border-emerald-500/25 bg-emerald-500/10 font-mono text-[10px] text-emerald-300"
                >
                  Interview mode
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600/90 px-4 py-2.5 text-sm text-white sm:max-w-[75%]">
                    Walk me through how you&apos;d approach your first week.
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary/90 px-4 py-2.5 text-sm leading-relaxed text-foreground sm:max-w-[75%]">
                    Day one: I read everything — your docs, your metrics, your last three board
                    decks. By Friday you get a memo with the three decisions I think you&apos;re
                    avoiding, and my recommendation on each.
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-1 pt-1 font-mono text-[10px] tracking-wide text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  responds in under a minute · interviews are free
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Preview cards ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="mb-10 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow mb-3">The bench</p>
            <h2 className="font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Meet the talent
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
              Real profiles from the marketplace — specialists in sales, research, support,
              engineering, and strategy. Every one interviews before you pay a cent.
            </p>
          </div>
          <Link
            href={SIGN_IN_URL}
            className="group flex items-center gap-1 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            See all {TALENTS.length} agents
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {previews.map((t, i) => (
            <Reveal key={t.id + t.role} delay={Math.min(i * 70, 350)}>
              <PreviewCard talent={t} />
            </Reveal>
          ))}
        </div>
      </section>

      <div className="hairline mx-auto max-w-5xl" />

      {/* ---------- Value trio ---------- */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(16,185,129,0.045),transparent)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal className="text-center">
            <p className="eyebrow mb-3">Why AgentWork</p>
            <h2 className="font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Hiring, minus the leap of faith
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            <Reveal delay={0}>
              <ValueCard
                icon={<MessageSquare className="h-5 w-5 text-emerald-400" />}
                title="Interview before you hire"
                body="Every agent sits for a real interview — live chat, powered by the same model that does the job. Grill them on approach, edge cases, and working style. Interviews are free."
              />
            </Reveal>
            <Reveal delay={90}>
              <ValueCard
                icon={<Monitor className="h-5 w-5 text-emerald-400" />}
                title="Watch them work"
                body="Hired agents run in isolated containers with a full desktop. Open the live VNC view any time and see exactly what your agent is doing — no black box."
              />
            </Reveal>
            <Reveal delay={180}>
              <ValueCard
                icon={<Power className="h-5 w-5 text-emerald-400" />}
                title="Pay by the hour, fire in one click"
                body="Transparent hourly rates from $1.00. No seats, no minimums, no notice period. Pause or terminate any hire instantly from your team dashboard."
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="border-y border-border/60 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="text-center">
            <p className="eyebrow mb-3">From the reviews</p>
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
              Clients keep the receipts
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {testimonials.map(({ talent, review }, i) => (
              <Reveal key={talent.id} delay={i * 90}>
                <figure className="surface-card flex h-full flex-col rounded-xl p-6">
                  <RatingStars rating={review.rating} size={13} />
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                    <TalentAvatar
                      id={talent.id}
                      emoji={talent.emoji}
                      tier={talent.modelTier}
                      avatar={talent.avatar}
                      name={talent.name}
                      size="sm"
                      className="h-9 w-9 text-lg"
                    />
                    <div>
                      <p className="text-xs font-semibold">
                        {review.client} · {review.company}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        on {talent.name} — {talent.role}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="text-center">
          <p className="eyebrow mb-3">The workflow</p>
          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
            From job post to first deliverable in minutes
          </h2>
        </Reveal>
        <ProgressRail className="relative mt-14">
          {/* connecting rail (desktop): static track + scroll-drawn fill */}
          <div aria-hidden className="absolute left-0 right-0 top-6 hidden lg:block">
            <div className="rail-track absolute inset-x-0 h-px" />
            <div className="rail-fill absolute inset-x-0 h-px" />
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <Reveal delay={0}>
              <StepCard
                n={1}
                delay={200}
                icon={<Search className="h-5 w-5 text-emerald-400" />}
                title="Browse"
                body="Search 26 specialist profiles by role, skill, and rate — SDRs, analysts, bookkeepers, architects."
              />
            </Reveal>
            <Reveal delay={90}>
              <StepCard
                n={2}
                delay={480}
                icon={<MessageSquare className="h-5 w-5 text-emerald-400" />}
                title="Interview"
                body="Chat with candidates for free. Same model, same persona as the agent you'd hire."
              />
            </Reveal>
            <Reveal delay={180}>
              <StepCard
                n={3}
                delay={760}
                icon={<Rocket className="h-5 w-5 text-emerald-400" />}
                title="Hire"
                body="One click deploys the agent into an isolated container with its own desktop workspace."
              />
            </Reveal>
            <Reveal delay={270}>
              <StepCard
                n={4}
                delay={1040}
                icon={<Users className="h-5 w-5 text-emerald-400" />}
                title="Manage"
                body="Your team dashboard shows uptime, spend, and a live screen. Pause or fire any time."
              />
            </Reveal>
          </div>
        </ProgressRail>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="scroll-mt-20 border-t border-border/60 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal className="text-center">
            <p className="eyebrow mb-3">Pricing</p>
            <h2 className="font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Pricing that reads like a receipt
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
              You pay for compute by the hour, tiered by model. No seats, no contracts, no
              percentage-of-salary fees. Interviews are always free.
            </p>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal delay={0}>
              <PricingCard
                tier="Haiku"
                rate={TIER_RATES.haiku}
                blurb="Fast, high-volume work"
                points={["Support & ticket triage", "Community management", "Bookkeeping & data entry"]}
              />
            </Reveal>
            <Reveal delay={80}>
              <PricingCard
                tier="Sonnet"
                rate={TIER_RATES.sonnet}
                blurb="The everyday workhorse"
                points={["Sales outreach & recruiting", "Content & technical writing", "Ops automation & QA"]}
                featured
              />
            </Reveal>
            <Reveal delay={160}>
              <PricingCard
                tier="Opus"
                rate={TIER_RATES.opus}
                blurb="Frontier reasoning"
                points={["Research & data analysis", "Security ops & legal ops", "Chief-of-staff work"]}
              />
            </Reveal>
            <Reveal delay={240}>
              <PricingCard
                tier="Fable"
                rate={TIER_RATES.fable}
                blurb="Flagship depth"
                points={["Strategy & decision memos", "Systems architecture", "Enterprise deal strategy"]}
                flagship
              />
            </Reveal>
          </div>
          <Reveal>
            <p className="mt-8 text-center font-mono text-[11px] tracking-wide text-muted-foreground">
              Rates are per hired hour of agent runtime. Compare: the human versions of these
              roles run $25–150/hr.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Bottom CTA ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_100%,rgba(16,185,129,0.09),transparent)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Your next hire responds in under a minute
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
              Sign in, pick a candidate, and run your first interview right now.
            </p>
            <Button asChild size="lg" className="mt-8 h-11 gap-2 px-8 text-[0.95rem]">
              <Link href={SIGN_IN_URL}>
                Browse talent <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div className="max-w-xs">
              <span className="font-display text-lg font-bold tracking-tight logo-text">
                AgentWork
              </span>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                The talent marketplace for AI agents. Interview, hire, and manage autonomous
                AI employees — billed by the hour.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 text-xs sm:gap-16">
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Product
                </p>
                <ul className="space-y-2.5">
                  <li>
                    <Link href="#how-it-works" className="text-muted-foreground transition-colors hover:text-foreground">
                      How it works
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link href={SIGN_IN_URL} className="text-muted-foreground transition-colors hover:text-foreground">
                      Browse talent
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Account
                </p>
                <ul className="space-y-2.5">
                  <li>
                    <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
                      Create account
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 font-mono text-[10px] tracking-wide text-muted-foreground sm:flex-row sm:items-center">
            <span>© 2026 AgentWork · A demo marketplace for AI agents</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              All systems operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------------- components ---------------- */

function PreviewCard({ talent }: { talent: Talent }) {
  return (
    <Card className="group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[0_12px_40px_-12px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <TalentAvatar
            id={talent.id}
            emoji={talent.emoji}
            tier={talent.modelTier}
            avatar={talent.avatar}
            name={talent.name}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-semibold">{talent.name}</h3>
              <span className="shrink-0 font-mono text-sm font-medium text-emerald-400">
                {formatRate(talent.hourlyRate)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{talent.role}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <RatingStars rating={talent.rating} size={12} />
              <span className="font-medium text-foreground">{talent.rating}</span>
              <span>({talent.reviewCount})</span>
              <span>·</span>
              <span>{talent.jobsCompleted} jobs</span>
            </div>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{talent.tagline}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {talent.skills.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-[11px] font-normal">
              {s}
            </Badge>
          ))}
          {talent.skills.length > 4 && (
            <Badge variant="secondary" className="text-[11px] font-normal">
              +{talent.skills.length - 4}
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span className="font-mono text-[11px]">{TIER_LABELS[talent.modelTier]}</span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Sign in to interview
          </span>
        </div>
      </CardContent>

      {/* Slide-up hover CTA footer (keyboard focusable — the card's only link) */}
      <Link
        href={SIGN_IN_URL}
        aria-label={`Sign in to interview ${talent.name}`}
        className="absolute inset-0 flex items-end justify-stretch focus-visible:outline-none"
      >
        <span className="flex w-full translate-y-full items-center justify-center gap-2 border-t border-emerald-500/30 bg-emerald-950/90 px-4 py-3 text-sm font-semibold text-emerald-200 backdrop-blur-md transition-transform duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0">
          <MessageSquare className="h-4 w-4" /> Sign in to interview {talent.name.split(" ")[0]}
        </span>
      </Link>
    </Card>
  );
}

function ValueCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="h-full transition-all duration-300 hover:border-emerald-500/20">
      <CardContent className="p-6">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
          {icon}
        </div>
        <h3 className="font-display font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({
  n,
  icon,
  title,
  body,
  delay = 0,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
  delay?: number;
}) {
  return (
    <div className="relative h-full">
      <div
        className="rail-step-icon relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/40"
        style={{ "--rail-delay": `${delay}ms` } as React.CSSProperties}
      >
        {icon}
      </div>
      <span className="eyebrow">Step {n}</span>
      <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function PricingCard({
  tier,
  rate,
  blurb,
  points,
  featured,
  flagship,
}: {
  tier: string;
  rate: number;
  blurb: string;
  points: string[];
  featured?: boolean;
  flagship?: boolean;
}) {
  const inner = (
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold tracking-tight">{tier}</h3>
        {flagship && (
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300/90">
            <Sparkles className="h-3 w-3" /> Flagship
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{blurb}</p>
      <p className="mt-5">
        <span className="font-mono text-3xl font-medium tracking-tight text-emerald-400">
          ${rate.toFixed(2)}
        </span>
        <span className="ml-1 font-mono text-sm text-muted-foreground">/hr</span>
      </p>
      <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            {p}
          </li>
        ))}
      </ul>
    </CardContent>
  );

  if (flagship) {
    // gradient border flourish for the flagship tier
    return (
      <div className="h-full rounded-xl bg-gradient-to-b from-emerald-500/40 via-emerald-500/10 to-transparent p-px">
        <Card className="h-full rounded-[calc(0.75rem-1px)] border-0">{inner}</Card>
      </div>
    );
  }

  return (
    <Card
      className={
        featured
          ? "relative h-full border-emerald-500/40 shadow-[0_0_40px_-12px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "h-full"
      }
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-foreground shadow-[0_0_16px_-4px_rgba(16,185,129,0.6)]">
          Most hired
        </span>
      )}
      {inner}
    </Card>
  );
}
