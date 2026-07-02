# Box Claws on Fly.io — AgentWork Integration Handoff

Box Claws now runs as Fly app **`agentwork-boxes`** (region sjc, org personal).
The dashboard API is **private-only**; AgentWork reaches it over Fly private
networking. The only public surface is a token-guarded VNC proxy.

## 1. Secrets to set on the `agentwork` Fly app

```bash
flyctl secrets set -a agentwork \
  BOXCLAWS_URL="http://agentwork-boxes.internal:3457"
```

Notes:
- Use `.internal` (verified working). `agentwork-boxes.flycast` also resolves
  but flycast proxying only covers ports in `[[services]]` — and we deliberately
  did NOT expose 3457 as a service (no auth on that API). `.internal:3457`
  hits the machine directly. The boxes machine is always-on
  (`auto_stop_machines = false`), so flycast autostart isn't needed.
- No AgentWork secret is needed for the VNC token — the Box Claws server
  embeds it in the `vncUrl` it returns (see §3).
- `ANTHROPIC_API_KEY` on agentwork is unchanged (still injected server-side
  by `app/api/boxclaws/[...path]/route.ts` on `POST /boxes`).

## 2. VNC proxy (how team-page iframes work now)

- Public endpoint: `https://agentwork-boxes.fly.dev` (only port 8080 inside,
  mapped to 443).
- Path scheme: `/vnc/{TOKEN}/{boxId}/vnc.html?...&path=vnc%2F{TOKEN}%2F{boxId}%2Fwebsockify`
  — the token rides in the path so all of noVNC's relative asset + websocket
  requests are authenticated without cookies (iframe-safe, no third-party
  cookie issues). `?token=` + cookie fallback also supported.
- Token secret: `VNC_PROXY_TOKEN` on the **agentwork-boxes** app (already set).
  Local copy: `~/.openclaw/credentials/agentwork-vnc-proxy-token` (chmod 600).
- Health: `https://agentwork-boxes.fly.dev/vnc/health-check` → `{"status":"ok"}`.
  Unauthenticated `/vnc/...` requests → 403. Everything else → 404.

## 3. Code changes already made in this repo (NOT committed/deployed)

- `lib/boxclaws.ts`
  - `BoxRecord` gained optional `vncUrl?: string`.
  - `novncUrl()` prefers the server-provided `vncUrl` (appends
    `resize=scale&view_only=false` when scaling requested); falls back to the
    old `http://localhost:{port}` form for local dev.
  - No changes needed in `app/team/[id]/page.tsx` — it already goes through
    `novncUrl()`.
- `app/api/boxclaws/[...path]/route.ts`
  - `POST /boxes` (deploy) timeout raised 15s → 120s: creating a box starts a
    container and waits for the agent gateway, which regularly exceeds 15s.
  - Note on the proxy's `scrub()`: it removes keys matching
    `/anthropic|apikey|api_key|token|secret/i`. The key `vncUrl` does not
    match, so it reaches the client intact. The VNC token being inside that
    URL is by design — the authed browser must be able to open the iframe
    (same trust level as the old direct localhost URLs).

## 4. Deploy steps (parent)

```bash
cd ~/Developer/agentwork
git add lib/boxclaws.ts "app/api/boxclaws/[...path]/route.ts" BOXCLAWS-FLY.md
git commit -m "Point Box Claws at Fly backend: server-provided vncUrl + longer deploy timeout"
flyctl secrets set -a agentwork BOXCLAWS_URL="http://agentwork-boxes.internal:3457"
flyctl deploy -a agentwork
```

(`next build` already verified passing with these changes.)

## 5. Verification

1. `curl https://agentwork-boxes.fly.dev/vnc/health-check` → ok
2. From an agentwork machine:
   `flyctl ssh console -a agentwork -C "curl -s http://agentwork-boxes.internal:3457/health"`
   → `{"status":"ok","version":"0.2.0"}`
3. In the AgentWork UI: hire a talent → box deploys → team page shows live
   noVNC iframe (URL will be `https://agentwork-boxes.fly.dev/vnc/<token>/<boxId>/vnc.html?...`).
4. Cleanup test hires with DELETE `/api/boxclaws/boxes/{id}`.

## 6. Ops notes / caveats

- **Single machine, always-on** (`shared-cpu-4x`, 8GB RAM, 4GB swap, 50GB
  volume at `/data`). State (boxes.json via `HOME=/data`, docker images,
  agent containers) lives on the volume — do NOT scale to >1 machine.
- **First boot after a wipe** builds `openclaw/agentbox:full` inside the VM
  (~10–15 min); it's cached in the volume afterwards, so restarts/redeploys
  are fast. Box creation fails with a clean error until the image exists.
- Deploys of agentwork-boxes restart the machine but keep the volume; agent
  containers have `restart: unless-stopped` and come back with dockerd.
- Memory headroom: each agent box runs an OpenClaw gateway + VNC + Chromium
  (~700MB–1.5GB under load). Expect ~4–6 concurrent boxes comfortably on 8GB
  + swap; scale VM (`flyctl scale memory 16384 -a agentwork-boxes`) for more.
- Cost: this VM bills 24/7 (shared-cpu-4x/8GB ≈ $41/mo + volume ≈ $7.50/mo).
- Rotating the VNC token: `flyctl secrets set VNC_PROXY_TOKEN=... -a agentwork-boxes`
  (update the local credentials file too). Old iframe URLs die immediately.
