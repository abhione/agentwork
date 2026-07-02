"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rocket, Loader2, ShieldCheck, ServerCog, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TalentAvatar } from "@/components/talent-avatar";
import { deployBox, checkHealth } from "@/lib/boxclaws";
import { recordHire } from "@/lib/hires";
import { TIER_LABELS, formatRate, type Talent } from "@/lib/talents";

export function HireDialog({
  talent,
  open,
  onOpenChange,
}: {
  talent: Talent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [apiUp, setApiUp] = useState<boolean | null>(null);

  useEffect(() => {
    if (open) {
      setName(`${talent.name.split(" ")[0].toLowerCase()}-${talent.role.split(" ")[0].toLowerCase()}`.replace(/[^a-z0-9-]/g, ""));
      checkHealth().then(setApiUp);
      // Legacy cleanup: keys are platform-managed now, never stored client-side.
      if (typeof window !== "undefined") localStorage.removeItem("agentwork:anthropic-key");
    }
  }, [open, talent]);

  const handleHire = async () => {
    if (!name.trim()) return toast.error("Give your new hire a workspace name");
    setDeploying(true);
    try {
      const box = await deployBox({
        name: name.trim(),
        persona: talent.personaId,
        model: talent.model,
        provider: "docker",
      });
      recordHire(box.id, talent.id);
      toast.success(`${talent.name} hired! Setting up their workspace…`);
      onOpenChange(false);
      router.push(`/team/${box.id}`);
    } catch (err) {
      toast.error(`Deploy failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TalentAvatar
              id={talent.id}
              emoji={talent.emoji}
              tier={talent.modelTier}
              avatar={talent.avatar}
              name={talent.name}
              size="sm"
            />
            <span>
              Hire {talent.name}
              <span className="block text-sm font-normal text-muted-foreground">{talent.role}</span>
            </span>
          </DialogTitle>
          <DialogDescription>
            This deploys {talent.name.split(" ")[0]} as a live agent in an isolated Box Claws
            container with their persona, skills, and a full desktop workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ServerCog className="h-4 w-4" />
              Compute
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{TIER_LABELS[talent.modelTier]}</Badge>
              <span className="font-semibold text-emerald-400">{formatRate(talent.hourlyRate)}</span>
            </div>
          </div>

          {apiUp === false && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Deployment infrastructure is temporarily offline. You can still interview{" "}
                {talent.name.split(" ")[0]} — hiring will be back shortly.
              </span>
            </div>
          )}
          {apiUp === true && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Box Claws infrastructure online — ready to deploy
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hire-name">Workspace name</Label>
            <Input
              id="hire-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="nova-sdr"
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Compute is included — {talent.name.split(" ")[0]} runs on AgentWork&apos;s
              infrastructure and bills to your account at the hourly rate. No API keys needed.
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deploying}>
            Cancel
          </Button>
          <Button onClick={handleHire} disabled={deploying || apiUp === false} className="gap-2">
            {deploying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Deploying…
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" /> Hire &amp; Deploy
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
