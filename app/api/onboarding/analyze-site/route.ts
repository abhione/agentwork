/**
 * Onboarding site analyzer.
 *
 * POST { url, category } → fetches the company website server-side, extracts
 * readable text, and asks the LLM to pre-fill the step-1 onboarding questions
 * for that persona category. Returns strict JSON:
 * { fields: { questionId: value }, source: "website" | "knowledge" }.
 *
 * Layered fallback:
 *   1. Direct fetch with realistic browser headers. Bot-challenge pages
 *      (Cloudflare "Just a moment…", Incapsula, Akamai) are detected and
 *      treated as fetch failures even on HTTP 200.
 *   2. If the site can't be read, ask the LLM to fill fields from what it
 *      reliably knows about the company at that domain (source: "knowledge").
 *
 * Only fields with clear evidence are filled; everything is editable by the
 * user afterwards. The Anthropic key never leaves the server.
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

/** Markers that indicate a bot-protection interstitial rather than real content. */
const CHALLENGE_MARKERS = [
  "just a moment",
  "challenges.cloudflare.com",
  "cf-browser-verification",
  "cf_chl_",
  "attention required! | cloudflare",
  "checking your browser before accessing",
  "_incapsula_resource",
  "incapsula incident",
  "request unsuccessful. incapsula",
  "akamai bot manager",
  "reference #18.", // Akamai block reference pages
  "ddos protection by",
  "verify you are human",
  "enable javascript and cookies to continue",
];

function looksLikeChallenge(html: string, status: number): boolean {
  const head = html.slice(0, 8000).toLowerCase();
  const marked = CHALLENGE_MARKERS.some((m) => head.includes(m));
  if (marked) return true;
  // Blocked statuses with tiny bodies are almost certainly bot walls
  if ((status === 403 || status === 503 || status === 429) && html.length < 20000) return true;
  return false;
}

interface FetchResult {
  html: string;
  status: number;
  challenge: boolean;
}

async function fetchPage(url: string, timeoutMs: number): Promise<FetchResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="126", "Google Chrome";v="126", "Not.A/Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });
    const type = res.headers.get("content-type") || "";
    if (res.ok && !type.includes("html") && !type.includes("text")) return null;
    // Cap raw HTML read at ~1.5MB
    const text = (await res.text()).slice(0, 1_500_000);
    const challenge = looksLikeChallenge(text, res.status);
    if (!res.ok && !challenge) return null;
    return { html: text, status: res.status, challenge };
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

const SHARED_FIELD_RULES = `Return ONLY a JSON object (no markdown, no commentary). Keys are the question ids below; values are the answers.

- Answers are written from the company's point of view, first person plural where natural ("We make…").
- Keep text answers concise: 1-3 sentences for textareas, a few words for short text fields.
- For select fields, the value MUST be exactly one of the listed option values.
- For multiselect fields, the value MUST be an array of listed option values.`;

async function callClaudeForFields(
  system: string,
  userMessage: string,
  questions: OnboardingQuestion[],
  apiKey: string
): Promise<Record<string, string | string[]>> {
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
      messages: [{ role: "user", content: userMessage }],
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

/** Layer 1: extract fields from fetched website text. */
async function extractFields(
  corpus: string,
  questions: OnboardingQuestion[],
  apiKey: string
): Promise<Record<string, string | string[]>> {
  const specs = questions.map(fieldSpec).join("\n");
  const system = `You analyze a company's website text and pre-fill onboarding answers for an AI employee that the company is hiring.

${SHARED_FIELD_RULES}
- Only include a field if the website gives clear evidence for it. Omit (or set null) anything you'd have to guess.
- Never invent products, metrics, competitors, or customers not supported by the text.

Fields:
${specs}`;
  return callClaudeForFields(
    system,
    `Website text:\n\n${corpus}\n\nReturn the JSON object now.`,
    questions,
    apiKey
  );
}

/** Layer 2: extract fields from the model's own knowledge of the company. */
async function extractFieldsFromKnowledge(
  url: URL,
  questions: OnboardingQuestion[],
  apiKey: string
): Promise<Record<string, string | string[]>> {
  const specs = questions.map(fieldSpec).join("\n");
  const system = `The website at a given domain could not be read directly (bot protection). Based ONLY on what you reliably know about the company or organization that operates that domain, pre-fill onboarding answers for an AI employee that the company is hiring.

${SHARED_FIELD_RULES}
- Only fill fields you are confident about from your training knowledge of this specific organization; return null (or omit) otherwise. Well-known organizations (hospitals, health systems, universities, major brands, large companies) you likely know well.
- If you don't recognize the organization behind this domain, return an empty JSON object {}. Never guess or invent facts, products, metrics, or customers.

Fields:
${specs}`;
  return callClaudeForFields(
    system,
    `Company website domain: ${url.hostname}\nFull URL: ${url.toString()}\n\nReturn the JSON object now.`,
    questions,
    apiKey
  );
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

  // Which questions can we fill? Step-1 (job context) for this category.
  const questions = getQuestionsForPersona(category || "Sales", 1).filter(
    (q) => !NON_INFERABLE.has(q.id)
  );

  // -------------------------------------------------------------------------
  // Layer 1: read the website directly
  // -------------------------------------------------------------------------
  const homepage = await fetchPage(url.toString(), HOMEPAGE_TIMEOUT_MS);
  const blocked = !homepage || homepage.challenge;

  let corpus = "";
  const pagesFetched: string[] = [];

  if (!blocked && homepage) {
    pagesFetched.push(url.toString());
    corpus = `=== HOMEPAGE (${url.hostname}) ===\n${htmlToText(homepage.html)}`;

    // Cheaply grab 1-2 obvious secondary pages if we have headroom
    if (corpus.length < MAX_CORPUS_CHARS) {
      const links = findSecondaryLinks(homepage.html, url, 2);
      const secondary = await Promise.all(
        links.map((l) => fetchPage(l, SECONDARY_TIMEOUT_MS))
      );
      for (let i = 0; i < links.length; i++) {
        const page = secondary[i];
        if (!page || page.challenge) continue;
        const text = htmlToText(page.html);
        if (text.length < 100) continue;
        corpus += `\n\n=== ${links[i]} ===\n${text}`;
        pagesFetched.push(links[i]);
        if (corpus.length >= MAX_CORPUS_CHARS) break;
      }
    }
    corpus = corpus.slice(0, MAX_CORPUS_CHARS);
  }

  const hasUsableCorpus = corpus.replace(/\s+/g, " ").length >= 200;

  if (hasUsableCorpus) {
    try {
      const fields = await extractFields(corpus, questions, apiKey);
      return Response.json({
        fields,
        source: "website",
        meta: {
          url: url.toString(),
          pagesFetched,
          chars: corpus.length,
          fieldCount: Object.keys(fields).length,
        },
      });
    } catch {
      // Fall through to knowledge fallback below
    }
  }

  // -------------------------------------------------------------------------
  // Layer 2: knowledge fallback — the site was unreachable, bot-protected,
  // or had too little readable content. Fill from what the model knows.
  // -------------------------------------------------------------------------
  try {
    const fields = await extractFieldsFromKnowledge(url, questions, apiKey);
    return Response.json({
      fields,
      source: "knowledge",
      meta: {
        url: url.toString(),
        pagesFetched,
        blocked,
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
