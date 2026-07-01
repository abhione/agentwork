"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Rocket, Send, Sparkles, Loader2 } from "lucide-react";
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
      {/* Interview header */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href={`/talent/${talent.id}`} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <TalentAvatar id={talent.id} emoji={talent.emoji} size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold">{talent.name}</h1>
                <Badge variant="secondary" className="text-[10px]">
                  Interview Mode
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{talent.role}</span>
                <span>·</span>
                <RatingStars rating={talent.rating} size={10} />
                <span>{talent.rating}</span>
                <span>·</span>
                <span className="text-emerald-400">{formatRate(talent.hourlyRate)}</span>
              </div>
            </div>
          </div>
          <Button onClick={() => setHireOpen(true)} className="gap-2 shadow-lg shadow-emerald-500/20">
            <Rocket className="h-4 w-4" /> Hire This Agent
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6">
          {messages.length === 0 && (
            <div className="py-10 text-center">
              <TalentAvatar id={talent.id} emoji={talent.emoji} size="lg" className="mx-auto" />
              <h2 className="mt-4 text-xl font-semibold">Interview {talent.name.split(" ")[0]}</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Chat with {talent.name.split(" ")[0]} before hiring — the same persona you&apos;ll
                get once deployed. Ask about approach, working style, or anything else.
              </p>
              <div className="mx-auto mt-6 grid max-w-lg gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <TalentAvatar id={talent.id} emoji={talent.emoji} size="sm" className="mt-0.5 h-8 w-8 text-base" />
                )}
                <div
                  className={cn(
                    "max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm bg-secondary text-foreground"
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
      <div className="border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-4xl items-end gap-3 px-6 py-4">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Ask ${talent.name.split(" ")[0]} anything…`}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
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
