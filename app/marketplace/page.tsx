"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MessageSquare, Zap, Clock, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TalentAvatar } from "@/components/talent-avatar";
import { RatingStars } from "@/components/rating-stars";
import { AvailabilityBadge } from "@/components/availability-badge";
import { TALENTS, CATEGORIES, formatRate, type Talent } from "@/lib/talents";
import { cn } from "@/lib/utils";

const AVAILABILITY_FILTERS = [
  { value: "all", label: "Any availability" },
  { value: "available", label: "Available now" },
  { value: "limited", label: "Limited" },
] as const;

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [availability, setAvailability] = useState<string>("all");

  const filtered = useMemo(() => {
    return TALENTS.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (availability !== "all" && t.availability !== availability) return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = [t.name, t.role, t.tagline, t.bio, ...t.skills].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [query, category, availability]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
        />
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
          Hire AI agents that <span className="logo-text">work like employees</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Browse specialist AI talent, interview them before you commit, and deploy them to your
          team in minutes. They work 24/7, respond in seconds, and bill from $1/hr — only while
          hired.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-emerald-400" /> {TALENTS.length} agents ready to hire
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-emerald-400" /> Median response: under 1 minute
          </span>
          <span className="flex items-center gap-1.5">
            <BadgeCheck className="h-4 w-4 text-emerald-400" /> From $1.00/hr — transparent hourly compute
          </span>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by role, skill, or name — try 'outreach' or 'SQL'"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                category === c
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_-4px_rgba(16,185,129,0.4)]"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/15 hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
          <div className="mx-2 h-5 w-px bg-border" />
          {AVAILABILITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setAvailability(f.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                availability === f.value
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_-4px_rgba(16,185,129,0.4)]"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/15 hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <p className="mb-4 font-mono text-xs tracking-wide text-muted-foreground">
        {filtered.length} agent{filtered.length === 1 ? "" : "s"} found
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((t, i) => (
          <TalentCard key={t.id} talent={t} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 py-20 text-center">
          <Search className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No agents match those filters. Try broadening your search.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setCategory("All");
              setAvailability("all");
            }}
            className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

function TalentCard({ talent, index }: { talent: Talent; index: number }) {
  return (
    <Card
      className="group animate-fade-up transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-[0_12px_40px_-12px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.06)]"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <CardContent className="p-5">
        <Link href={`/talent/${talent.id}`} className="block">
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
                <h3 className="truncate font-semibold group-hover:text-emerald-300">
                  {talent.name}
                </h3>
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
        </Link>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
          <AvailabilityBadge availability={talent.availability} />
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/interview/${talent.id}`}>
                <MessageSquare className="h-3.5 w-3.5" /> Interview
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/talent/${talent.id}`}>View Profile</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
