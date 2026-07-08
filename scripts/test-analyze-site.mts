/**
 * Local harness for the analyze-site route (bypasses auth middleware).
 * Usage: npx tsx scripts/test-analyze-site.mts https://stripe.com Sales
 */
import { POST } from "../app/api/onboarding/analyze-site/route";

const url = process.argv[2] || "https://stripe.com";
const category = process.argv[3] || "Sales";

const req = new Request("http://localhost:3900/api/onboarding/analyze-site", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url, category }),
});

const started = Date.now();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const res = await POST(req as any);
console.log(`status=${res.status} (${Date.now() - started}ms)`);
console.log(JSON.stringify(await res.json(), null, 2));
