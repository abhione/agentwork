# Agent Tooling — Desktop Parity & Capability Wiring

How AgentWork's "agent's computer" reaches Manus.im parity, and how agent
capabilities are wired into OpenClaw. (July 2026)

## 1. The Agent's Computer panel (Manus parity)

Manus's signature UX is a split-pane: chat on the left, a live "Manus's
Computer" panel on the right that switches between browser/terminal/editor
views, headed by a "Manus is using X" label, with user takeover and a
step-indexed replay. AgentWork now mirrors that on `app/team/[id]/page.tsx`:

| Manus feature | AgentWork implementation |
|---|---|
| Split-pane chat + computer | Chat (left, 1 col) + `components/agent-computer.tsx` (right, 2 cols) |
| "using Browser/Terminal" header | Derived from live tool telemetry (`currentToolFrom`) |
| Live desktop view | Existing noVNC iframe (Xvfb + x11vnc in each box) |
| Take over control | Watch/Take-control toggle → noVNC `view_only` param |
| Terminal | Real shell via box exec endpoint (`components/computer-terminal.tsx`) |
| File outputs | Workspace browser + previews (`components/computer-files.tsx`); agents save deliverables to `workspace/deliverables/` |
| Step timeline / replay | `components/computer-steps.tsx` — every real tool call, parsed from the box's OpenClaw session JSONL |

### Telemetry pipeline (real, not simulated)

```
box OpenClaw gateway → ~/.openclaw/agents/*/sessions/*.jsonl  (toolCall/toolResult records)
  → GET /api/box-activity/[id]   (auth, execs a tail of the newest session file)
  → lib/agent-activity.ts        (parses into AgentEvent timeline)
  → lib/use-agent-activity.ts    (client polling: 6s idle, 2.5s during a chat turn)
```

The old simulated Work Log and metrics on the team page were replaced by this
feed (metrics "Tool actions" and "Messages" are now real counts).

## 2. Per-hire skills bundle (boxes)

Every new hire gets a skills bundle installed into its box workspace
(`workspace/skills/` is OpenClaw's highest-precedence skill dir — no
openclaw.json changes needed in the box):

- `document-toolkit` (pandoc + LibreOffice headless), `pdf-toolkit`
  (poppler-utils), `ocr` (tesseract), `media-toolkit` (ffmpeg/imagemagick),
  `spreadsheet-toolkit` (openpyxl), `web-research` (method + deliverables
  convention).

Wiring: `lib/agent-skills.ts` → `bootstrapAgentTools(boxId)` called
post-deploy in `components/hire-dialog.tsx` via the box exec endpoint. It also
best-effort apt-installs the underlying CLIs in the background. Failures never
block a hire.

## 3. Local OpenClaw gateway (operator machine)

Installed globally to `~/.openclaw/skills/` (already on `skills.load.extraDirs`):
`office`, `pdf`, `pandoc`, `tesseract-ocr`, `ffmpeg`, `spreadsheet`.
All host binaries verified present (pandoc, soffice, pdftotext, tesseract,
ffmpeg, magick). Config backup: `~/.openclaw/openclaw.json.bak-agentwork-tooling-20260712`.

### Ready-to-add when API keys are available

```bash
# Web scraping/crawling MCP (needs FIRECRAWL_API_KEY)
openclaw mcp add firecrawl --command npx --arg -y --arg firecrawl-mcp --env FIRECRAWL_API_KEY=<key>
# Semantic web search MCP (needs EXA_API_KEY)
openclaw mcp add exa --url https://mcp.exa.ai/mcp --transport streamable-http
```

## 4. Future: heavier per-agent desktops

Current boxes run Xvfb + x11vnc + noVNC + Chromium (fine for browser/terminal
work). If agents need full desktop apps, ranked options for one-per-agent Fly
Machines:

1. **DIY stack** (what OpenClaw's `computer-use` skill ships: Xvfb + XFCE +
   x11vnc + noVNC + xdotool) — lightest, matches current architecture. Note
   GHSA-25gx-x37c-7pph: always keep VNC auth/token wiring on the noVNC proxy.
2. **linuxserver/webtop** — KasmVNC/Selkies, polished full desktops
   (audio/clipboard), heavier per box.
3. **m1k1o/neko** — WebRTC streaming, best live-view latency, but needs TURN
   config behind Fly's proxy.

## 5. Deploying this work

```bash
git add -A && git commit -m "feat: Manus-parity agent computer panel + agent tooling wiring"
flyctl deploy -a agentwork
```

No new secrets required — `/api/box-activity` reuses `BOXCLAWS_URL`.
