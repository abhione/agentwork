/**
 * Agent tool skills — a bundle of OpenClaw AgentSkills (SKILL.md files)
 * installed into each hired agent's box workspace. Workspace `skills/` is the
 * highest-precedence skill dir in OpenClaw discovery, so these load without
 * touching the box's openclaw.json.
 *
 * Delivered post-deploy via the box exec endpoint (see bootstrapScript), which
 * also best-effort installs the underlying CLI tools the skills call.
 */
import { execInBox } from "@/lib/boxclaws";

export interface AgentSkill {
  slug: string;
  content: string;
}

function skill(slug: string, name: string, description: string, body: string): AgentSkill {
  return {
    slug,
    content: `---\nname: ${name}\ndescription: ${description}\n---\n\n${body.trim()}\n`,
  };
}

export const AGENT_SKILLS: AgentSkill[] = [
  skill(
    "document-toolkit",
    "document-toolkit",
    "Create and convert documents — Markdown/HTML/DOCX/PPTX/XLSX/PDF — with pandoc and LibreOffice headless. Use whenever the user asks for a report, deck, spreadsheet, or file conversion.",
    `
## Recipes

- Markdown → DOCX: \`pandoc report.md -o report.docx\`
- Markdown → PDF (via HTML): \`pandoc report.md -o report.pdf\` (falls back: \`pandoc report.md -o report.html && soffice --headless --convert-to pdf report.html\`)
- DOCX/PPTX/XLSX → PDF: \`soffice --headless --convert-to pdf file.docx --outdir .\`
- HTML → DOCX: \`pandoc page.html -o page.docx\`

## Rules

- If a binary is missing, install it first: \`apt-get update -qq && apt-get install -y pandoc libreoffice-writer libreoffice-calc libreoffice-impress\` (ok to skip LibreOffice if only pandoc is needed).
- Save all finished documents to \`~/.openclaw/workspace/deliverables/\` so the client can see them in their Files panel.
- Prefer clean, professional formatting; add a title and date to reports.
`
  ),
  skill(
    "pdf-toolkit",
    "pdf-toolkit",
    "Read, extract, split, and render PDFs using poppler-utils (pdftotext, pdftoppm, pdfinfo). Use when a task involves reading or producing PDF content.",
    `
## Recipes

- Extract text: \`pdftotext -layout in.pdf out.txt\`
- Page count / metadata: \`pdfinfo in.pdf\`
- Render page to image (for inspection): \`pdftoppm -png -f 1 -l 1 -r 120 in.pdf page\`
- Select pages: \`pdftocairo -pdf -f 2 -l 5 in.pdf pages2-5.pdf\`

## Rules

- Install if missing: \`apt-get update -qq && apt-get install -y poppler-utils\`.
- For scanned PDFs with no text layer, render pages to PNG and use the ocr skill.
`
  ),
  skill(
    "ocr",
    "ocr",
    "Extract text from images and scanned documents with tesseract OCR. Use when given screenshots, photos of documents, or scanned PDFs.",
    `
## Recipes

- Image → text: \`tesseract input.png out\` (writes out.txt)
- With language: \`tesseract input.png out -l eng\`

## Rules

- Install if missing: \`apt-get update -qq && apt-get install -y tesseract-ocr\`.
- Clean up OCR output before using it — fix obvious misreads in context.
`
  ),
  skill(
    "media-toolkit",
    "media-toolkit",
    "Convert, trim, resize, and inspect audio/video/images with ffmpeg and ImageMagick. Use for any media processing task.",
    `
## Recipes

- Convert video: \`ffmpeg -i in.mov -c:v libx264 -preset fast out.mp4\`
- Trim: \`ffmpeg -ss 00:00:05 -to 00:00:15 -i in.mp4 -c copy clip.mp4\`
- Extract audio: \`ffmpeg -i in.mp4 -vn -acodec libmp3lame out.mp3\`
- Resize image: \`convert in.png -resize 1200x out.png\`
- Screenshot from video: \`ffmpeg -i in.mp4 -ss 3 -frames:v 1 thumb.png\`

## Rules

- Install if missing: \`apt-get update -qq && apt-get install -y ffmpeg imagemagick\`.
- Keep outputs in \`~/.openclaw/workspace/deliverables/\`.
`
  ),
  skill(
    "spreadsheet-toolkit",
    "spreadsheet-toolkit",
    "Analyze and produce spreadsheets/CSVs with python3 (openpyxl, csv, statistics). Use for data cleanup, analysis, or building an Excel deliverable.",
    `
## Recipes

- Ensure deps: \`pip3 install --quiet openpyxl 2>/dev/null || pip3 install --break-system-packages --quiet openpyxl\`
- Read/write XLSX with a short python3 script (openpyxl); CSVs with the stdlib csv module.
- Always sanity-check row counts and a sample of values before reporting conclusions.

## Rules

- Deliver finished workbooks to \`~/.openclaw/workspace/deliverables/\`.
- Include a brief README or summary sheet describing what you produced.
`
  ),
  skill(
    "web-research",
    "web-research",
    "Structured multi-source web research: search broadly, open primary sources in the browser, cross-check claims, and write up findings with links. Use for any research, comparison, or due-diligence request.",
    `
## Method

1. Decompose the question into 2-4 sub-questions.
2. Search each; open the top primary sources in the browser (not just snippets).
3. Cross-check any load-bearing claim across two independent sources.
4. Write findings to \`~/.openclaw/workspace/deliverables/<topic>-research.md\` with a source list, then summarize in chat.

## Rules

- Prefer primary sources (docs, filings, official blogs) over aggregators.
- Note disagreements between sources instead of picking silently.
`
  ),
];

/**
 * Shell script that installs the skills bundle into the box workspace and
 * best-effort installs the CLI tools they use (background, non-fatal).
 * No user input is interpolated — content is static and heredoc-quoted.
 */
export function bootstrapScript(): string {
  const parts: string[] = ['set -e', 'W="$HOME/.openclaw/workspace"', 'mkdir -p "$W/deliverables"'];
  for (const s of AGENT_SKILLS) {
    parts.push(`mkdir -p "$W/skills/${s.slug}"`);
    parts.push(`cat > "$W/skills/${s.slug}/SKILL.md" << 'EOF_AGENTWORK_SKILL'\n${s.content}EOF_AGENTWORK_SKILL`);
  }
  // Preinstall common tools in the background so first use is fast; skills
  // degrade gracefully (they self-install) if this fails.
  parts.push(
    '( command -v pandoc >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq pandoc poppler-utils tesseract-ocr ffmpeg imagemagick; } ) >/dev/null 2>&1 &'
  );
  parts.push('echo SKILLS_INSTALLED');
  return parts.join("\n");
}

/**
 * Install the skills bundle into a freshly deployed box. Best-effort: a hire
 * still succeeds if this fails (the agent just starts with fewer skills).
 */
export async function bootstrapAgentTools(boxId: string): Promise<boolean> {
  try {
    const { stdout } = await execInBox(boxId, ["sh", "-c", bootstrapScript()]);
    return stdout.includes("SKILLS_INSTALLED");
  } catch {
    return false;
  }
}
