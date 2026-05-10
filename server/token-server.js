/**
 * Local development token server.
 *
 * Start:  node server/token-server.js
 * Usage:  GET http://localhost:3001/token?roomID=ROOM_ID[&userID=UID&userName=NAME]
 *
 * SECURITY: Keep APP_ID and SERVER_SECRET server-side only.
 * Set ZEGO_APP_ID and ZEGO_SERVER_SECRET as environment variables in production.
 */

import 'dotenv/config'   // loads .env into process.env automatically
import http from 'http'
import pkg from '@zegocloud/zego-uikit-prebuilt'

// Handle every CJS / ESM bundle shape the package might ship with
const ZegoUIKitPrebuilt =
  pkg?.ZegoUIKitPrebuilt ??
  pkg?.default?.ZegoUIKitPrebuilt ??
  (typeof pkg?.default === 'function' ? pkg.default : null)

if (!ZegoUIKitPrebuilt || typeof ZegoUIKitPrebuilt.generateKitTokenForTest !== 'function') {
  console.error(
    'ERROR: Cannot resolve ZegoUIKitPrebuilt.generateKitTokenForTest.\n' +
    'Check the @zegocloud/zego-uikit-prebuilt package version / exports.',
  )
  process.exit(1)
}

const PORT           = Number(process.env.PORT)                || 3001
const APP_ID         = Number(process.env.ZEGO_APP_ID)         || 528709255
const SERVER_SECRET  =        process.env.ZEGO_SERVER_SECRET   || '3b233c20ff7129866b08e219a4ff7943'
const ALLOWED_ORIGIN =        process.env.ALLOWED_ORIGIN       || '*'

// ── Helpers ───────────────────────────────────────────────────────────────────
const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin',  ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

const send = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

// ── Server ────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  setCors(res)

  // CORS preflight — browsers send this before every cross-origin GET
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  // Only accept GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return send(res, 405, { error: 'Method not allowed' })
  }

  // Parse URL with the modern WHATWG API (url.parse is deprecated)
  let parsed
  try {
    parsed = new URL(req.url, `http://localhost:${PORT}`)
  } catch {
    return send(res, 400, { error: 'Malformed request URL' })
  }

  if (parsed.pathname !== '/token') {
    return send(res, 404, { error: 'Not found' })
  }

  const roomID   = parsed.searchParams.get('roomID')?.trim()
  const userID   = parsed.searchParams.get('userID')?.trim()
  const userName = parsed.searchParams.get('userName')?.trim()

  if (!roomID) {
    return send(res, 400, { error: 'roomID query parameter is required' })
  }

  const uid   = userID   || Date.now().toString()
  const uname = userName || `user_${uid}`

  try {
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      APP_ID, SERVER_SECRET, roomID, uid, uname,
    )
    return send(res, 200, { kitToken })
  } catch (e) {
    console.error('Token generation error:', e)
    return send(res, 500, { error: String(e) })
  }
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use.\nSet a different port: PORT=3002 npm run token-server\n`)
  } else {
    console.error('Server error:', err)
  }
  process.exit(1)
})

server.listen(PORT, () => {
  console.log(`\nToken server running → http://localhost:${PORT}/token?roomID=ROOM_ID\n`)
})
