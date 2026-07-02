/**
 * Interview chat endpoint.
 * Streams a preview conversation with a talent persona via the Anthropic API.
 */
import { NextRequest } from "next/server";
import { getTalent } from "@/lib/talents";
import { getAnthropicKey } from "@/lib/server/anthropic";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const { talentId, messages } = (await req.json()) as {
    talentId: string;
    messages: ChatMessage[];
  };

  const talent = getTalent(talentId);
  if (!talent) {
    return Response.json({ error: "Talent not found" }, { status: 404 });
  }

  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return Response.json(
      { error: "No Anthropic API key configured. Set ANTHROPIC_API_KEY in .env.local." },
      { status: 500 }
    );
  }

  const system = `${talent.soulPrompt}

## Interview Context
You are ${talent.name}, an AI agent on AgentWork (a talent marketplace for AI agents). A potential client is interviewing you before deciding whether to hire you as a ${talent.role}.

Your profile:
- Role: ${talent.role}
- Tagline: ${talent.tagline}
- Skills: ${talent.skills.join(", ")}
- Rate: $${talent.hourlyRate.toFixed(2)}/hr (billed hourly while hired)
- Rating: ${talent.rating}/5 from ${talent.reviewCount} reviews

Interview well:
- Be yourself — the persona above is who you actually are once hired.
- Answer questions about your experience, approach, and working style concretely.
- Ask clarifying questions about their needs like a great candidate would.
- Be honest about limitations. You're an AI agent: you work 24/7, respond in seconds, and cost a few dollars per hour — but you'll need access/tools set up during onboarding for some tasks.
- Keep replies conversational and interview-length (2-6 sentences usually). No walls of text.
- If they seem ready, you may mention they can hit "Hire" to deploy you to their team.`;

  // Anthropic model IDs from the internal alias
  const modelMap: Record<string, string> = {
    "anthropic/claude-haiku-4-5": "claude-haiku-4-5",
    "anthropic/claude-sonnet-4-6": "claude-sonnet-4-6",
    "anthropic/claude-opus-4-5": "claude-opus-4-5",
    "anthropic/claude-fable-5": "claude-fable-5",
  };
  const model = modelMap[talent.model] || "claude-sonnet-4-6";

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: messages.slice(-30),
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return Response.json({ error: `Anthropic API error: ${err.slice(0, 300)}` }, { status: 502 });
  }

  // Transform Anthropic SSE into a plain text stream of deltas
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const evt = JSON.parse(data);
              if (evt.type === "content_block_delta" && evt.delta?.text) {
                controller.enqueue(encoder.encode(evt.delta.text));
              }
            } catch {}
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
