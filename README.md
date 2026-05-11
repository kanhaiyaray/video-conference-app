# 📹 Video‑Conference‑App — Real‑Time HD Video Calling in the Browser

A real-time peer-to-peer video calling web application built with **React.js**, **Vite**, and **ZegoCloud UIKit**. Users can create or join video rooms instantly using shareable invite links — no account required.

🔗 **Live Demo:** [react-js-video-call-app.vercel.app](https://react-js-video-call-app.vercel.app/)

---

## ✨ Features

- 🎥 **Real-time video & audio calling** powered by ZegoCloud UIKit
- 🔗 **Shareable invite links** — share a room link with anyone to join instantly
- 🏠 **Room-based routing** — each call has a unique room ID (e.g. `/room/5`)
- 👤 **Custom display names** — users set their name before joining
- 🔐 **Secure server-side token generation** — tokens generated via Node.js `crypto`, never exposed in frontend
- 📱 **Responsive UI** — works on desktop and mobile browsers
- ⚡ **Fast builds** with Vite v8 + Rolldown bundler
- ☁️ **Zero-config deployment** on Vercel with serverless API routes

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js 18, React Router DOM |
| Build Tool | Vite v8 (Rolldown bundler) |
| Video SDK | ZegoCloud UIKit Prebuilt |
| API / Backend | Vercel Serverless Functions (Node.js) |
| Token Auth | Node.js `crypto` (AES-128-CBC, Token04) |
| Deployment | Vercel |
| Styling | CSS Modules / Inline styles |

---

## 📁 Project Structure

```
React.Js_Video_Call_App/
│
├── api/
│   └── token.js              # Vercel serverless function — generates ZegoCloud Token04
│                             # Uses Node.js crypto only (NO browser SDK here)
│
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Root component with routing
│   └── components/
│       ├── RoomPage.jsx      # Video call room with ZegoCloud UIKit
│       └── LobbyPage.jsx     # Join room form (name input, invite link)
│
├── public/
│   └── vite.svg              # App favicon
│
├── .env                      # Local environment variables (NOT committed)
├── .env.example              # Template for required env vars
├── vite.config.js            # Vite build config with chunk splitting & warning suppression
├── vercel.json               # Vercel deployment config (SPA routing + API functions)
├── package.json              # Dependencies & scripts
└── README.md                 # This file
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
VITE_ZEGO_APP_ID=your_numeric_app_id
VITE_ZEGO_SERVER_SECRET=your_32_character_server_secret
```

> ⚠️ **Never commit your `.env` file.** It is already in `.gitignore`.

### How to get your ZegoCloud credentials

1. Sign up free at [console.zegocloud.com](https://console.zegocloud.com)
2. Create a new project
3. Copy your **AppID** (numeric) and **Server Secret** (32-char string)
4. Paste them into your `.env` file

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- Node.js `20.x` or higher
- npm `9+`

### Install & Run

```bash
# 1. Clone the repository
git clone https://github.com/kanhaiyaray/React.Js_Video_Call_App.git
cd React.Js_Video_Call_App

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your ZegoCloud credentials

# 4. Start development server
npm run dev
```

App runs at **http://localhost:5173**

### Available Scripts

```bash
npm run dev      # Start development server (hot reload)
npm run build    # Build for production
npm run preview  # Preview production build locally
```

---

## ☁️ Deploying to Vercel

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "your message"
git push origin main
```

### Step 2 — Import project on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Vercel auto-detects Vite — no framework config needed

### Step 3 — Set Environment Variables in Vercel Dashboard

Go to **Project → Settings → Environment Variables** and add:

| Key | Value |
|---|---|
| `VITE_ZEGO_APP_ID` | Your numeric App ID |
| `VITE_ZEGO_SERVER_SECRET` | Your 32-char Server Secret |

> These must be added in the **Vercel Dashboard** — `.env` files are not deployed.

### Step 4 — Disable Deployment Protection (for shareable links)

Go to **Project → Settings → Deployment Protection** → Set to **Disabled** or **Production only**

This allows anyone with your invite link to join without a Vercel login prompt.

### Step 5 — Redeploy

After adding env vars, trigger a new deployment:
**Vercel Dashboard → Deployments → Redeploy**

---

## 🔧 Key Configuration Files

### `vercel.json`

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ],
  "functions": {
    "api/token.js": {
      "maxDuration": 10
    }
  }
}
```

**Why the catch-all rewrite?** This app uses React Router (client-side routing). Without the `/(.*) → /index.html` rewrite, refreshing `/room/5` or opening a shared link returns `404: NOT_FOUND` because Vercel looks for a file at that path instead of serving the React app.

### `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 6000,
    rolldownOptions: {
      onwarn(warning, defaultHandler) {
        // ZegoCloud SDK uses eval internally — suppress third-party warning
        if (warning.code === 'EVAL') return;
        defaultHandler(warning);
      },
    },
  },
})
```

### `api/token.js` (Serverless Function)

The token endpoint generates a **ZegoCloud Token04** using pure Node.js `crypto` — no browser SDK is imported here. This is critical because ZegoCloud's UIKit Prebuilt package accesses `document` at module load time, which crashes in a Node.js serverless environment.

```
GET /api/token?userId=User_1234
→ { token: "04...", userId: "User_1234" }
```

---

## 🐛 Bugs Fixed During Deployment

| Error | Cause | Fix |
|---|---|---|
| `ReferenceError: document is not defined` | `api/token.js` imported browser-only ZegoCloud SDK | Rewrote token generation using Node.js `crypto` only |
| `404: NOT_FOUND` on `/room/:id` refresh | No SPA fallback route in Vercel | Added `/(.*) → /index.html` rewrite in `vercel.json` |
| `404` on shared invite links | Same as above | Same fix |
| `403 Forbidden` on preview links | Vercel Deployment Protection enabled | Disabled in Vercel dashboard settings |
| `[EVAL] Warning` in build logs | ZegoCloud SDK uses `eval` internally | Suppressed via `rolldownOptions.onwarn` in Vite config |
| Chunk size warning (5MB bundle) | ZegoCloud SDK is large | Raised `chunkSizeWarningLimit` to 6000 |
| Node engine upgrade warning | `"node": ">=18.0.0"` in package.json | Pinned to `"node": "20.x"` |

---

## 🔐 How Token Authentication Works

```
Browser (React App)
       │
       │  GET /api/token?userId=User_1234
       ▼
Vercel Serverless Function (api/token.js)
       │
       │  Reads VITE_ZEGO_APP_ID + VITE_ZEGO_SERVER_SECRET
       │  Generates Token04 using AES-128-CBC (Node.js crypto)
       │
       ▼
Returns { token: "04xxxxx...", userId: "User_1234" }
       │
       ▼
ZegoCloud UIKit uses token to authenticate & join room ✅
```

Server Secret **never leaves the server** — it's only used inside the serverless function.

---

## 🤝 How to Share a Room

1. Open the app and navigate to a room (e.g. `/room/5`)
2. Click **"Copy Invite Link"**
3. Share the link with anyone
4. They open the link, enter their name, and join the same room

Each room URL is a unique meeting — just change the number for a new room.

---

## 📝 License

MIT License — feel free to contribute.

---

## 🙏 Acknowledgements

- [ZegoCloud](https://www.zegocloud.com/) — video calling SDK
- [Vite](https://vitejs.dev/) — blazing fast build tool
- [Vercel](https://vercel.com/) — seamless deployment platform
- [React](https://react.dev/) — UI library
