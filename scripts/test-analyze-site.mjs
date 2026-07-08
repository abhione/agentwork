/**
 * Local test harness for the analyze-site route handler.
 * Invokes the POST handler directly (bypasses auth middleware, which is
 * irrelevant to the fetch/LLM logic under test).
 *
 * Usage: node scripts/test-analyze-site.mjs <url>
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Resolve "@/..." alias to repo root
const aliasLoader = `
export async function resolve(specifier, context, next) {
  if (specifier === "next/server") specifier = "next/server.js";
  if (specifier.startsWith("@/")) {
    specifier = new URL(specifier.slice(2), ${JSON.stringify(pathToFileURL(process.cwd() + "/").href)}).href;
    for (const ext of ["", ".ts", ".tsx", "/index.ts"]) {
      try { return await next(specifier + ext, context); } catch {}
    }
  }
  return next(specifier, context);
}
`;
register(new URL(`data:text/javascript,${encodeURIComponent(aliasLoader)}`));

const { POST } = await import("../app/api/onboarding/analyze-site/route.ts");

const url = process.argv[2] || "https://www.browardhealth.org";
const req = {
  json: async () => ({ url, category: "Sales" }),
};

const started = Date.now();
const res = await POST(req);
const body = await res.json();
console.log(`status=${res.status} elapsed=${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(JSON.stringify(body, null, 2));
