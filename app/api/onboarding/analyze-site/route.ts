/**
 * Onboarding site analyzer.
 *
 * POST { url, category } → fetches the company website server-side, extracts
 * readable text, and asks the LLM to pre-fill the step-1 onboarding questions
 * for that persona category. Returns strict JSON: { fields: { questionId: value } }.
 *
 * Only fields with clear evidence on the site are filled; everything is
 * editable by the user afterwards. The Anthropic key never leaves the server.
 */
import { NextRequest } from "next/server";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { getAnthropicKey } from "@/lib/server/anthropic";
import {
  getQuestionsForPersona,
  type OnboardingQuestion,
} from "@/lib/onboarding-questions";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CORPUS_CHARS = 18000;
const HOMEPAGE_TIMEOUT_MS = 10000;
const SECONDARY_TIMEOUT_MS = 6000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// SSRF guards
// ---------------------------------------------------------------------------

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isPrivateIPv4(ip);
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb"))
      return true; // link-local
    // IPv4-mapped
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);
    return false;
  }
  return true; // not an IP → caller handles
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".flycast")
  ) {
    throw new Error("This address can't be analyzed");
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("This address can't be analyzed");
    return url;
  }
  // Resolve and check all addresses
  try {
    const addrs = await lookup(host, { all: true, verbatim: true });
    if (addrs.length === 0) throw new Error("Site not found");
    for (const { address } of addrs) {
      if (isPrivateIp(address)) throw new Error("This address can't be analyzed");
    }
  } catch (err) {
    if (err instanceof Error && err.message === "This address can't be analyzed") throw err;
    throw new Error("Couldn't resolve that domain");
  }
  return url;
}

// ---------------------------------------------------------------------------
// Fetch + HTML → text
// ---------------------------------------------------------------------------

async function fetchPage(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html") && !type.includes("text")) return null;
    // Cap raw HTML read at ~1.5MB
    const text = await res.text();
    return text.slice(0, 1_500_000);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&rdquo;": '"',
  "&ldquo;": '"',
  "&hellip;": "…",
  "&copy;": "©",
  "&trade;": "™",
  "&reg;": "®",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 16));
      } catch {
        return "";
      }
    })
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ");
}

function extractMeta(html: string, attr: string, value: string): string | null {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]*>`,
    "i"
  );
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() : null;
}

function htmlToText(html: string): string {
  const parts: string[] = [];

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) parts.push(`PAGE TITLE: ${decodeEntities(title.trim())}`);

  const desc = extractMeta(html, "name", "description");
  if (desc) parts.push(`META DESCRIPTION: ${desc}`);
  const ogTitle = extractMeta(html, "property", "og:title");
  if (ogTitle && ogTitle !== title?.trim()) parts.push(`OG TITLE: ${ogTitle}`);
  const ogDesc = extractMeta(html, "property", "og:description");
  if (ogDesc && ogDesc !== desc) parts.push(`OG DESCRIPTION: ${ogDesc}`);
  const ogSite = extractMeta(html, "property", "og:site_name");
  if (ogSite) parts.push(`SITE NAME: ${ogSite}`);

  let body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg|iframe|canvas|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ");

  // Mark headings so structure survives
  body = body.replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => {
    const t = decodeEntities(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    return t ? `\n## ${t}\n` : "\n";
  });

  body = body
    .replace(/<\/(p|div|li|section|article|tr|br|ul|ol|nav|footer|header)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const text = decodeEntities(body)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n")
    .trim();

  parts.push(text);
  return parts.join("\n");
}

/** Find up to `max` promising secondary pages (about/product/services) on the same origin. */
function findSecondaryLinks(html: string, base: URL, max = 2): string[] {
  const found = new Map<string, number>(); // path → priority
  const PATTERNS: [RegExp, number][] = [
    [/^\/about(-us)?\/?$/i, 0],
    [/^\/company\/?$/i, 1],
    [/^\/(products?|services|solutions|platform)\/?$/i, 2],
    [/^\/what-we-do\/?$/i, 3],
  ];
  const hrefs = html.match(/href=["'][^"']+["']/gi) || [];
  for (const h of hrefs) {
    const raw = h.slice(6, -1);
    let u: URL;
    try {
      u = new URL(raw, base);
    } catch {
      continue;
    }
    if (u.origin !== base.origin) continue;
    for (const [re, prio] of PATTERNS) {
      if (re.test(u.pathname)) {
        const key = u.origin + u.pathname;
        if (!found.has(key) || found.get(key)! > prio) found.set(key, prio);
      }
    }
  }
  return [...found.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, max)
    .map(([k]) => k);
}

// ---------------------------------------------------------------------------
// LLM extraction
// ---------------------------------------------------------------------------

/** Question ids that can't be inferred from a website. */
const NON_INFERABLE = new Set([
  "website_url",
  "key_documents",
  "templates",
  "tools_access",
  // Preference questions, not website facts:
  "outreach_channels",
]);

function fieldSpec(q: OnboardingQuestion): string {
  let type: string;
  switch (q.type) {
    case "select":
      type = `one of: ${q.options?.map((o) => JSON.stringify(o.value)).join(", ")}`;
      break;
    case "multiselect":
      type = `array with any of: ${q.options?.map((o) => JSON.stringify(o.value)).join(", ")}`;
      break;
    case "textarea":
      type = "string (1-3 sentences)";
      break;
    default:
      type = "string (short)";
  }
  const opts =
    q.options && q.type !== "text"
      ? ` Options mean: ${q.options.map((o) => `${o.value}=${o.label}`).join("; ")}.`
      : "";
  return `- "${q.id}" (${type}): ${q.label}${q.helpText ? ` — ${q.helpText}` : ""}${opts}`;
}

async function extractFields(
  corpus: string,
  questions: OnboardingQuestion[],
  apiKey: string
): Promise<Record<string, string | string[]>> {
  const specs = questions.map(fieldSpec).join("\n");

  const system = `You analyze a company's website text and pre-fill onboarding answers for an AI employee that the company is hiring.

Return ONLY a JSON object (no markdown, no commentary). Keys are the question ids below; values are the answers.

Rules:
- Only include a field if the website gives clear evidence for it. Omit (or set null) anything you'd have to guess.
- Answers are written from the company's point of view, first person plural where natural ("We make…").
- Keep text answers concise: 1-3 sentences for textareas, a few words for short text fields.
- For select fields, the value MUST be exactly one of the listed option values.
- For multiselect fields, the value MUST be an array of listed option values.
- Never invent products, metrics, competitors, or customers not supported by the text.

Fields:
${specs}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      temperature: 0,
      system,
      messages: [
        {
          role: "user",
          content: `Website text:\n\n${corpus}\n\nReturn the JSON object now.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === "text")?.text || "";
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try to find the outermost object
    const m = jsonStr.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("LLM returned non-JSON output");
    parsed = JSON.parse(m[0]);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("LLM returned unexpected JSON shape");
  }

  // Validate against the question bank
  const byId = new Map(questions.map((q) => [q.id, q]));
  const fields: Record<string, string | string[]> = {};
  for (const [key, raw] of Object.entries(parsed as Record<string, unknown>)) {
    const q = byId.get(key);
    if (!q || raw === null || raw === undefined) continue;
    if (q.type === "multiselect") {
      if (!Array.isArray(raw)) continue;
      const valid = new Set(q.options?.map((o) => o.value));
      const vals = raw.filter((v): v is string => typeof v === "string" && valid.has(v));
      if (vals.length) fields[key] = vals;
    } else if (q.type === "select") {
      if (typeof raw !== "string") continue;
      if (q.options?.some((o) => o.value === raw)) fields[key] = raw;
    } else {
      if (typeof raw !== "string") continue;
      const v = raw.trim();
      if (v) fields[key] = v.slice(0, 2000);
    }
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: { url?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  let raw = (body.url || "").trim();
  if (!raw) return Response.json({ error: "Missing url" }, { status: 400 });
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;

  const category = (body.category || "").trim();

  let url: URL;
  try {
    url = await assertSafeUrl(raw);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Invalid URL" },
      { status: 400 }
    );
  }

  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return Response.json({ error: "No Anthropic API key configured" }, { status: 500 });
  }

  // 1. Fetch homepage
  const homepageHtml = await fetchPage(url.toString(), HOMEPAGE_TIMEOUT_MS);
  if (!homepageHtml) {
    return Response.json({ error: "Couldn't fetch that site" }, { status: 422 });
  }

  const pagesFetched: string[] = [url.toString()];
  let corpus = `=== HOMEPAGE (${url.hostname}) ===\n${htmlToText(homepageHtml)}`;

  // 2. Cheaply grab 1-2 obvious secondary pages if we have headroom
  if (corpus.length < MAX_CORPUS_CHARS) {
    const links = findSecondaryLinks(homepageHtml, url, 2);
    const secondary = await Promise.all(links.map((l) => fetchPage(l, SECONDARY_TIMEOUT_MS)));
    for (let i = 0; i < links.length; i++) {
      const html = secondary[i];
      if (!html) continue;
      const text = htmlToText(html);
      if (text.length < 100) continue;
      corpus += `\n\n=== ${links[i]} ===\n${text}`;
      pagesFetched.push(links[i]);
      if (corpus.length >= MAX_CORPUS_CHARS) break;
    }
  }
  corpus = corpus.slice(0, MAX_CORPUS_CHARS);

  if (corpus.replace(/\s+/g, " ").length < 200) {
    return Response.json(
      { error: "The site didn't have enough readable content" },
      { status: 422 }
    );
  }

  // 3. Which questions can we fill? Step-1 (job context) for this category.
  const questions = getQuestionsForPersona(category || "Sales", 1).filter(
    (q) => !NON_INFERABLE.has(q.id)
  );
  // Also let it infer brand voice / company culture style questions across categories
  // only when they're part of this persona's question set (handled by the filter above).

  try {
    const fields = await extractFields(corpus, questions, apiKey);
    return Response.json({
      fields,
      meta: {
        url: url.toString(),
        pagesFetched,
        chars: corpus.length,
        fieldCount: Object.keys(fields).length,
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 502 }
    );
  }
}
