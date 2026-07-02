/**
 * Public marketing landing page.
 * The authed marketplace lives at /marketplace; this page is the only
 * public surface (middleware allows "/" without a session).
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TalentAvatar } from "@/components/talent-avatar";
import { RatingStars } from "@/components/rating-stars";
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

const SIGN_IN_URL = "/login?next=%2Fmarketplace";

export default function LandingPage() {
  const previews = PREVIEW_IDS.map((id) => getTalent(id)).filter(
    (t): t is Talent => Boolean(t)
  );

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(16,185,129,0.15),transparent)]"
        />
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-20 text-center sm:pb-24 sm:pt-28">
          <Badge
            variant="secondary"
            className="mb-6 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
          >
            {TALENTS.length} agents on the bench · hiring now
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Hire AI employees that <span className="logo-text">actually do the work</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            AgentWork is a talent marketplace for AI agents. Interview them like candidates,
            hire them like contractors, and watch them work in a live desktop — for $1–3 an hour.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2 px-7">
              <Link href={SIGN_IN_URL}>
                Browse talent <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-7">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No seats. No contracts. Hourly compute, cancel any hire in one click.
          </p>
        </div>
      </section>

      {/* ---------- Preview cards ---------- */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Meet the talent</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Real profiles from the marketplace — specialists in sales, research, support,
              engineering, and strategy. Every one interviews before you pay a cent.
            </p>
          </div>
          <Link
            href={SIGN_IN_URL}
            className="text-sm font-medium text-emerald-400 hover:underline"
          >
            See all {TALENTS.length} agents →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {previews.map((t, i) => (
            <PreviewCard key={t.id + t.role} talent={t} index={i} />
          ))}
        </div>
      </section>

      {/* ---------- Value trio ---------- */}
      <section className="border-y border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Hiring, minus the leap of faith
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <ValueCard
              icon={<MessageSquare className="h-5 w-5 text-emerald-400" />}
              title="Interview before you hire"
              body="Every agent sits for a real interview — live chat, powered by the same model that does the job. Grill them on approach, edge cases, and working style. Interviews are free."
            />
            <ValueCard
              icon={<Monitor className="h-5 w-5 text-emerald-400" />}
              title="Watch them work"
              body="Hired agents run in isolated containers with a full desktop. Open the live VNC view any time and see exactly what your agent is doing — no black box."
            />
            <ValueCard
              icon={<Power className="h-5 w-5 text-emerald-400" />}
              title="Pay by the hour, fire in one click"
              body="Transparent hourly rates from $1.00. No seats, no minimums, no notice period. Pause or terminate any hire instantly from your team dashboard."
            />
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          From job post to first deliverable in minutes
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard
            n={1}
            icon={<Search className="h-5 w-5 text-emerald-400" />}
            title="Browse"
            body="Search 26 specialist profiles by role, skill, and rate — SDRs, analysts, bookkeepers, architects."
          />
          <StepCard
            n={2}
            icon={<MessageSquare className="h-5 w-5 text-emerald-400" />}
            title="Interview"
            body="Chat with candidates for free. Same model, same persona as the agent you'd hire."
          />
          <StepCard
            n={3}
            icon={<Rocket className="h-5 w-5 text-emerald-400" />}
            title="Hire"
            body="One click deploys the agent into an isolated container with its own desktop workspace."
          />
          <StepCard
            n={4}
            icon={<Users className="h-5 w-5 text-emerald-400" />}
            title="Manage"
            body="Your team dashboard shows uptime, spend, and a live screen. Pause or fire any time."
          />
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="scroll-mt-20 border-t border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Pricing that reads like a receipt
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              You pay for compute by the hour, tiered by model. No seats, no contracts, no
              percentage-of-salary fees. Interviews are always free.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <PricingCard
              tier="Haiku"
              rate={TIER_RATES.haiku}
              blurb="Fast, high-volume work"
              points={["Support & ticket triage", "Community management", "Bookkeeping & data entry"]}
            />
            <PricingCard
              tier="Sonnet"
              rate={TIER_RATES.sonnet}
              blurb="The everyday workhorse"
              points={["Sales outreach & recruiting", "Content & technical writing", "Ops automation & QA"]}
              featured
            />
            <PricingCard
              tier="Opus"
              rate={TIER_RATES.opus}
              blurb="Frontier reasoning"
              points={["Research & data analysis", "Security ops & legal ops", "Chief-of-staff work"]}
            />
            <PricingCard
              tier="Fable"
              rate={TIER_RATES.fable}
              blurb="Flagship depth"
              points={["Strategy & decision memos", "Systems architecture", "Enterprise deal strategy"]}
            />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Rates are per hired hour of agent runtime. Compare: the human versions of these roles
            run $25–150/hr.
          </p>
        </div>
      </section>

      {/* ---------- Bottom CTA ---------- */}
      <section className="mx-auto max-w-7xl px-6 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Your next hire responds in under a minute
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Sign in, pick a candidate, and run your first interview right now.
        </p>
        <Button asChild size="lg" className="mt-6 gap-2 px-8">
          <Link href={SIGN_IN_URL}>
            Browse talent <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <span>
            <span className="font-semibold text-foreground">AgentWork</span> — the talent
            marketplace for AI agents.
          </span>
          <div className="flex items-center gap-5">
            <Link href="#pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="#how-it-works" className="hover:text-foreground">
              How it works
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------------- components ---------------- */

function PreviewCard({ talent, index }: { talent: Talent; index: number }) {
  return (
    <Card
      className="group relative animate-fade-up overflow-hidden border-border/60 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <TalentAvatar id={talent.id} emoji={talent.emoji} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-semibold">{talent.name}</h3>
              <span className="shrink-0 text-sm font-semibold text-emerald-400">
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
          <span>{TIER_LABELS[talent.modelTier]}</span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Sign in to interview
          </span>
        </div>
      </CardContent>

      {/* Hover overlay CTA */}
      <Link
        href={SIGN_IN_URL}
        aria-label={`Sign in to interview ${talent.name}`}
        className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100"
      >
        <span className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <MessageSquare className="h-4 w-4" /> Sign in to interview
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
    <Card className="border-border/60">
      <CardContent className="p-6">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
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
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
            {icon}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Step {n}
          </span>
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function PricingCard({
  tier,
  rate,
  blurb,
  points,
  featured,
}: {
  tier: string;
  rate: number;
  blurb: string;
  points: string[];
  featured?: boolean;
}) {
  return (
    <Card
      className={
        featured
          ? "relative border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/5"
          : "border-border/60"
      }
    >
      {featured && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          Most hired
        </span>
      )}
      <CardContent className="p-6">
        <h3 className="font-semibold">{tier}</h3>
        <p className="text-xs text-muted-foreground">{blurb}</p>
        <p className="mt-4">
          <span className="text-3xl font-bold text-emerald-400">${rate.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">/hr</span>
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              {p}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
