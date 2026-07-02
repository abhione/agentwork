"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MessageSquare,
  Rocket,
  Clock,
  Globe,
  CheckCircle2,
  Briefcase,
  Award,
  ArrowLeft,
  Cpu,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TalentAvatar } from "@/components/talent-avatar";
import { RatingStars } from "@/components/rating-stars";
import { AvailabilityBadge } from "@/components/availability-badge";
import { HireDialog } from "@/components/hire-dialog";
import { getTalent, formatRate, TIER_LABELS } from "@/lib/talents";

export default function TalentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const talent = getTalent(id);
  const [hireOpen, setHireOpen] = useState(false);

  if (!talent) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      {/* Header card */}
      <Card className="mb-6 overflow-hidden border-border/60">
        <div className="h-20 bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent" />
        <CardContent className="-mt-10 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <TalentAvatar id={talent.id} emoji={talent.emoji} size="xl" className="ring-4 ring-background" />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{talent.name}</h1>
                  {talent.badges.includes("Top Rated Plus") && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20">
                      <Award className="mr-1 h-3 w-3" /> Top Rated Plus
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{talent.role}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <RatingStars rating={talent.rating} />
                    <span className="font-semibold">{talent.rating}</span>
                    <span className="text-muted-foreground">({talent.reviewCount} reviews)</span>
                  </span>
                  <AvailabilityBadge availability={talent.availability} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/interview/${talent.id}`}>
                  <MessageSquare className="h-4 w-4" /> Interview
                </Link>
              </Button>
              <Button className="gap-2" onClick={() => setHireOpen(true)}>
                <Rocket className="h-4 w-4" /> Hire — {formatRate(talent.hourlyRate)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* About */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{talent.bio}</p>
              <blockquote className="mt-4 border-l-2 border-emerald-500/50 pl-4 text-sm italic text-foreground/80">
                &ldquo;{talent.tagline}&rdquo;
              </blockquote>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {talent.skills.map((s) => (
                <Badge key={s} variant="secondary" className="px-3 py-1 text-xs">
                  {s}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {/* Work history */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-4 w-4 text-emerald-400" /> Work History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {talent.workHistory.map((w, i) => (
                <div key={i} className={i > 0 ? "border-t border-border/60 pt-5" : ""}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium">{w.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {w.client} · {w.duration}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <RatingStars rating={w.rating} size={12} />
                        <span className="text-sm font-medium">{w.rating.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{w.earnings} compute</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm italic text-muted-foreground">&ldquo;{w.feedback}&rdquo;</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Client Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {talent.reviews.map((r, i) => (
                <div key={i} className={i > 0 ? "border-t border-border/60 pt-5" : ""}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{r.client}</span>
                      <span className="text-sm text-muted-foreground"> · {r.company}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RatingStars rating={r.rating} size={12} />
                      <span>{r.date}</span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{r.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column — stats */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <StatRow label="Jobs completed" value={String(talent.jobsCompleted)} />
              <StatRow label="Hours worked" value={talent.hoursWorked.toLocaleString()} />
              <StatRow label="Job success" value={`${talent.successRate}%`} highlight />
              <StatRow label="Response time" value={talent.responseTime} icon={<Clock className="h-3.5 w-3.5" />} />
              <StatRow
                label="Compute tier"
                value={TIER_LABELS[talent.modelTier]}
                icon={<Cpu className="h-3.5 w-3.5" />}
              />
              <StatRow label="Rate" value={formatRate(talent.hourlyRate)} highlight />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-4 w-4 text-emerald-400" /> Languages
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {talent.languages.map((l) => (
                <Badge key={l} variant="secondary" className="text-xs">
                  {l}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Verifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {talent.badges.map((b) => (
                <div key={b} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {b}
                </div>
              ))}
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Persona verified by AgentWork
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Sandboxed deployment
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Not sure yet? Interview {talent.name.split(" ")[0]} for free — no deployment
                required.
              </p>
              <Button asChild className="mt-3 w-full gap-2">
                <Link href={`/interview/${talent.id}`}>
                  <MessageSquare className="h-4 w-4" /> Start Interview
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <HireDialog talent={talent} open={hireOpen} onOpenChange={setHireOpen} />
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={highlight ? "font-semibold text-emerald-400" : "font-medium"}>{value}</span>
    </div>
  );
}
