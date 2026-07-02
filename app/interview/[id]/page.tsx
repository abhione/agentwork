"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Rocket, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TalentAvatar } from "@/components/talent-avatar";
import { RatingStars } from "@/components/rating-stars";
import { HireDialog } from "@/components/hire-dialog";
import { getTalent, formatRate } from "@/lib/talents";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Walk me through how you'd approach your first week.",
  "What do you need from me to do your best work?",
  "Tell me about a tricky situation you'd handle differently than a human.",
  "What are your limitations I should know about?",
];

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const talent = getTalent(id);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hireOpen, setHireOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!talent) notFound();

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talentId: talent.id, messages: next }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages(next); // drop the empty assistant bubble
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Interview header — hairline accent gives the room a stage */}
      <div className="relative border-b border-border bg-card/50 backdrop-blur-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent"
        />
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href={`/talent/${talent.id}`} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <TalentAvatar
              id={talent.id}
              emoji={talent.emoji}
              tier={talent.modelTier}
              avatar={talent.avatar}
              name={talent.name}
              size="sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold">{talent.name}</h1>
                <Badge
                  variant="secondary"
                  className="border-emerald-500/25 bg-emerald-500/10 font-mono text-[10px] text-emerald-300"
                >
                  Interview Mode
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{talent.role}</span>
                <span>·</span>
                <RatingStars rating={talent.rating} size={10} />
                <span>{talent.rating}</span>
                <span>·</span>
                <span className="font-mono text-emerald-400">{formatRate(talent.hourlyRate)}</span>
              </div>
            </div>
          </div>
          <Button onClick={() => setHireOpen(true)} className="gap-2">
            <Rocket className="h-4 w-4" />
            <span className="hidden sm:inline">Hire This Agent</span>
            <span className="sm:hidden">Hire</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          {messages.length === 0 && (
            <div className="animate-fade-up py-10 text-center">
              <div className="relative mx-auto w-fit">
                <div
                  aria-hidden
                  className="absolute -inset-5 rounded-full bg-emerald-500/[0.10] blur-2xl"
                />
                <TalentAvatar
                  id={talent.id}
                  emoji={talent.emoji}
                  tier={talent.modelTier}
                  avatar={talent.avatar}
                  name={talent.name}
                  size="lg"
                  className="relative"
                />
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
                Interview {talent.name.split(" ")[0]}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Chat with {talent.name.split(" ")[0]} before hiring — the same persona you&apos;ll
                get once deployed. Ask about approach, working style, or anything else.
              </p>
              <div className="mx-auto mt-6 grid max-w-lg gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="group flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-left text-sm text-muted-foreground transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] hover:text-foreground"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400/80 transition-colors group-hover:text-emerald-300" />
                    <span className="flex-1">{q}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-emerald-400 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex animate-fade-up gap-3",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {m.role === "assistant" && (
                  <TalentAvatar
                    id={talent.id}
                    emoji={talent.emoji}
                    tier={talent.modelTier}
                    avatar={talent.avatar}
                    name={talent.name}
                    size="sm"
                    className="mt-0.5 h-8 w-8 text-base"
                  />
                )}
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]",
                    m.role === "user"
                      ? "rounded-br-sm bg-emerald-600 text-white shadow-[0_2px_12px_-4px_rgba(16,185,129,0.4)]"
                      : "rounded-bl-sm border border-white/[0.05] bg-secondary/90 text-foreground"
                  )}
                >
                  {m.content || (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-end gap-3 px-4 py-4 sm:px-6">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Ask ${talent.name.split(" ")[0]} anything…`}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-white/[0.02] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-500/40 focus:ring-1 focus:ring-ring"
          />
          <Button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <HireDialog talent={talent} open={hireOpen} onOpenChange={setHireOpen} />
    </div>
  );
}
