# Video Call (ZegoCloud) — Vercel Deployment

A React + Vite video-calling app powered by [ZegoCloud](https://www.zegocloud.com/).
Designed to deploy **end-to-end on Vercel** — the React frontend ships as static
files and the token endpoint runs as a Vercel Serverless Function. **No other
platform is required.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                               │
│                                                             │
│   Static frontend  ──────►  Serverless Function             │
│   (dist/, React)            api/token.js  →  /api/token     │
│                             (generates ZegoCloud kitToken)  │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend** — built by `vite build` to `dist/`, served by Vercel's CDN.
- **Token API** — `api/token.js` is auto-detected by Vercel and exposed at
  `/api/token`. It signs a ZegoCloud `kitToken` server-side so your
  `ZEGO_SERVER_SECRET` never reaches the browser.
- **SPA routing** — `vercel.json` rewrites every non-`/api/*` path to
  `index.html` so React Router deep-links work on refresh.

---

## Project layout

```
.
├── api/
│   └── token.js              # Vercel Serverless Function → /api/token
├── server/
│   └── token-server.js       # Local-dev token server (not deployed)
├── src/                      # React app
├── index.html
├── vite.config.js
├── vercel.json               # Vercel config (build + SPA rewrites)
├── package.json
├── .env.example              # Copy to .env for local dev
└── README.md
```

---

## Prerequisites

- Node.js **18+**
- A free [ZegoCloud account](https://console.zegocloud.com) — grab your
  **AppID** and **ServerSecret** from the console.
- A [Vercel account](https://vercel.com) (free tier is fine).

---

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then edit .env and paste your ZEGO_APP_ID + ZEGO_SERVER_SECRET

# 3. Run the local token server (terminal 1)
npm run token-server
# → http://localhost:3001/token?roomID=...

# 4. Run the Vite dev server (terminal 2)
npm run dev
# → http://localhost:5173
```

The frontend reads `VITE_TOKEN_SERVER_URL` from `.env`. For local dev keep it
as `http://localhost:3001`. In production on Vercel, **leave it empty** — the
app will call the same-origin `/api/token` route automatically.

---

## Deploy to Vercel

1. Push this repo to GitHub / GitLab / Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Vite. Defaults are correct — no overrides needed:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Open **Settings → Environment Variables** and add:

   | Name                 | Value                          | Environments              |
   |----------------------|--------------------------------|---------------------------|
   | `ZEGO_APP_ID`        | your ZegoCloud AppID (number)  | Production, Preview, Dev  |
   | `ZEGO_SERVER_SECRET` | your ZegoCloud ServerSecret    | Production, Preview, Dev  |

   > Do **not** add `VITE_TOKEN_SERVER_URL` in production — leaving it unset
   > makes the frontend call `/api/token` on the same origin, which is what
   > you want.

5. Click **Deploy**. Done.

---

## Environment variables reference

| Variable                | Where        | Required | Notes                                             |
|-------------------------|--------------|----------|---------------------------------------------------|
| `ZEGO_APP_ID`           | Server       | yes      | ZegoCloud AppID. Used by `api/token.js`.          |
| `ZEGO_SERVER_SECRET`    | Server       | yes      | ZegoCloud ServerSecret. Never expose to client.   |
| `VITE_TOKEN_SERVER_URL` | Frontend     | dev only | Local dev: `http://localhost:3001`. Prod: unset.  |
| `PORT`                  | Local server | no       | Port for `server/token-server.js` (default 3001). |

`VITE_*` variables are inlined into the client bundle at build time, so never
put secrets there. `ZEGO_APP_ID` / `ZEGO_SERVER_SECRET` (no `VITE_` prefix)
stay server-side inside the Vercel function.

---

## How the token endpoint works

`api/token.js` is a standard Vercel Serverless Function (Node.js runtime).
Vercel automatically:

1. Detects any file under `/api/*` and deploys it as a function.
2. Routes `GET /api/token?roomID=...&userID=...&userName=...` to the handler.
3. Injects `process.env.ZEGO_APP_ID` and `process.env.ZEGO_SERVER_SECRET`
   from your project's environment variables.

Response shape:

```json
{ "kitToken": "..." }
```

The frontend then passes `kitToken` to `ZegoUIKitPrebuilt.create(kitToken)`
to join a room.

> The bundled `generateKitTokenForTest` is fine for development and
> small-scale production. For high-traffic apps, switch to ZegoCloud's
> server-side token generation with proper expiry / signature rotation.

---

## Troubleshooting

**"roomID is required" on `/api/token`** — pass `?roomID=some_room` in the
URL. The frontend does this automatically; check that your room ID is non-empty.

**Token endpoint returns `500`** — the most common cause is missing
environment variables. Open Vercel → Project → Settings → Environment
Variables and confirm both `ZEGO_APP_ID` and `ZEGO_SERVER_SECRET` are set,
then **redeploy** (env-var changes don't apply to existing deployments).

**Refreshing a route gives 404** — make sure `vercel.json` is committed.
Its rewrite rule is what tells Vercel to serve `index.html` for client-side
routes.

**Camera/mic blocked** — browsers require **HTTPS** for `getUserMedia`.
Your `*.vercel.app` URL is HTTPS by default, so this only affects custom
local setups. Use `localhost` (not your LAN IP) for local dev.

**CORS error in dev** — confirm the local token server is running on the
port matching `VITE_TOKEN_SERVER_URL`. The dev server replies with
`Access-Control-Allow-Origin: *` by default.

---

## Scripts

| Command                | What it does                                    |
|------------------------|-------------------------------------------------|
| `npm run dev`          | Start Vite dev server on `:5173`                |
| `npm run token-server` | Start local token server on `:3001` (dev only)  |
| `npm run build`        | Build frontend to `dist/`                       |
| `npm run preview`      | Preview the production build locally            |
| `npm run lint`         | Run ESLint                                      |

---

## License

MIT
