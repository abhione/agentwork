"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deployBox, checkHealth } from "@/lib/boxclaws";
import { recordHire } from "@/lib/hires";
import { generateAgentFiles } from "@/lib/soul-generator";
import type { Talent } from "@/lib/talents";
import type { OnboardingAnswers } from "@/lib/onboarding-questions";
import { OnboardingWizard } from "./onboarding-wizard";

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
  const [, setApiUp] = useState<boolean | null>(null);

  // Check API health when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      checkHealth().then(setApiUp);
    }
    onOpenChange(isOpen);
  };

  const handleComplete = async (answers: OnboardingAnswers, workspaceName: string) => {
    // Generate customized agent files
    const agentFiles = generateAgentFiles(talent, answers);

    // Deploy with custom files
    const box = await deployBox({
      name: workspaceName,
      persona: talent.personaId,
      model: talent.model,
      provider: "docker",
      agentFiles,
      onboardingAnswers: answers,
    });

    recordHire(box.id, talent.id);
    toast.success(`${talent.name} hired! Setting up their workspace…`);
    onOpenChange(false);
    router.push(`/team/${box.id}`);
  };

  return (
    <OnboardingWizard
      talent={talent}
      open={open}
      onOpenChange={handleOpenChange}
      onComplete={handleComplete}
    />
  );
}
