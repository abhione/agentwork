"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  HelpCircle,
  Loader2,
  Rocket,
  Sparkles,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TalentAvatar } from "@/components/talent-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Talent } from "@/lib/talents";
import {
  getQuestionsForPersona,
  STEP_META,
  type OnboardingAnswers,
  type OnboardingQuestion,
  type OnboardingStep,
} from "@/lib/onboarding-questions";

interface OnboardingWizardProps {
  talent: Talent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (answers: OnboardingAnswers, workspaceName: string) => Promise<void>;
}

const TOTAL_STEPS = 4;

export function OnboardingWizard({
  talent,
  open,
  onOpenChange,
  onComplete,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [workspaceName, setWorkspaceName] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setStep(1);
      setAnswers({});
      setWorkspaceName(
        `${talent.name.split(" ")[0].toLowerCase()}-${talent.role
          .split(" ")[0]
          .toLowerCase()}`.replace(/[^a-z0-9-]/g, "")
      );
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const questions = getQuestionsForPersona(talent.category, step);
  const stepMeta = STEP_META[step];

  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMultiSelect = (questionId: string, value: string) => {
    const current = (answers[questionId] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateAnswer(questionId, updated);
  };

  const canProceed = () => {
    const requiredQuestions = questions.filter((q) => q.required);
    return requiredQuestions.every((q) => {
      const answer = answers[q.id];
      if (Array.isArray(answer)) return answer.length > 0;
      return !!answer?.toString().trim();
    });
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((step + 1) as OnboardingStep);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as OnboardingStep);
    }
  };

  const handleDeploy = async () => {
    if (!workspaceName.trim()) {
      setError("Please enter a workspace name");
      return;
    }
    setError(null);
    setDeploying(true);
    try {
      await onComplete(answers, workspaceName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeploying(false);
    }
  };

  const handleSkipToEnd = () => {
    setStep(4 as OnboardingStep);
  };

  const renderQuestion = (q: OnboardingQuestion) => {
    const value = answers[q.id];

    return (
      <div key={q.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={q.id} className="text-sm font-medium">
            {q.label}
            {q.required && <span className="ml-1 text-red-400">*</span>}
          </Label>
          {q.helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  {q.helpText}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {q.type === "text" && (
          <Input
            id={q.id}
            value={(value as string) || ""}
            onChange={(e) => updateAnswer(q.id, e.target.value)}
            placeholder={q.placeholder}
          />
        )}

        {q.type === "url" && (
          <Input
            id={q.id}
            type="url"
            value={(value as string) || ""}
            onChange={(e) => updateAnswer(q.id, e.target.value)}
            placeholder={q.placeholder}
          />
        )}

        {q.type === "textarea" && (
          <Textarea
            id={q.id}
            value={(value as string) || ""}
            onChange={(e) => updateAnswer(q.id, e.target.value)}
            placeholder={q.placeholder}
            rows={3}
            className="resize-none"
          />
        )}

        {q.type === "select" && q.options && (
          <Select
            value={(value as string) || ""}
            onValueChange={(v) => updateAnswer(q.id, v)}
          >
            <SelectTrigger id={q.id}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {q.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {q.type === "multiselect" && q.options && (
          <div className="flex flex-wrap gap-2">
            {q.options.map((opt) => {
              const selected = ((value as string[]) || []).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMultiSelect(q.id, opt.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    selected
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-emerald-500/30 hover:bg-emerald-500/10"
                  )}
                >
                  {selected && <Check className="mr-1 inline h-3 w-3" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <TalentAvatar
              id={talent.id}
              emoji={talent.emoji}
              tier={talent.modelTier}
              avatar={talent.avatar}
              name={talent.name}
              size="sm"
            />
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Customize {talent.name.split(" ")[0]}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {talent.role} • Personalize for your business
              </DialogDescription>
            </div>
            <div className="text-xs text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  s <= step ? "bg-emerald-500" : "bg-secondary"
                )}
              />
            ))}
          </div>
        </DialogHeader>

        {/* Step content */}
        <div className="max-h-[50vh] overflow-y-auto py-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">{stepMeta.title}</h3>
            <p className="text-xs text-muted-foreground">{stepMeta.description}</p>
          </div>

          <div className="space-y-4">
            {questions.map(renderQuestion)}

            {/* Workspace name on final step */}
            {step === 4 && (
              <div className="mt-6 space-y-2 border-t border-border pt-4">
                <Label htmlFor="workspace-name" className="text-sm font-medium">
                  Workspace Name
                  <span className="ml-1 text-red-400">*</span>
                </Label>
                <Input
                  id="workspace-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="nova-sdr"
                />
                <p className="text-xs text-muted-foreground">
                  A unique identifier for this agent&apos;s workspace.
                </p>
              </div>
            )}

            {/* No questions for this step/category */}
            {questions.length === 0 && step !== 4 && (
              <div className="rounded-lg border border-border bg-secondary/20 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No additional questions for this step.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  className="mt-2 gap-1"
                >
                  Continue <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={handleBack} disabled={deploying}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 && (
              <Button variant="ghost" onClick={handleSkipToEnd} className="text-xs">
                Skip to deploy
              </Button>
            )}

            {step < 4 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleDeploy} disabled={deploying || !workspaceName.trim()}>
                {deploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deploying…
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" /> Deploy {talent.name.split(" ")[0]}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
