/**
 * Vercel Serverless Function — auto-deployed at /api/token
 * Set ZEGO_APP_ID and ZEGO_SERVER_SECRET in Vercel project settings → Environment Variables.
 */

import pkg from '@zegocloud/zego-uikit-prebuilt'

const ZegoUIKitPrebuilt =
  pkg?.ZegoUIKitPrebuilt ??
  pkg?.default?.ZegoUIKitPrebuilt ??
  (typeof pkg?.default === 'function' ? pkg.default : null)

const APP_ID = Number(process.env.ZEGO_APP_ID)    || 0
const SECRET =        process.env.ZEGO_SERVER_SECRET || ''

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const roomID   = String(req.query.roomID   || '').trim()
  const userID   = String(req.query.userID   || '').trim()
  const userName = String(req.query.userName || '').trim()

  if (!roomID) return res.status(400).json({ error: 'roomID is required' })

  const uid   = userID   || Date.now().toString()
  const uname = userName || `user_${uid}`

  try {
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      APP_ID, SECRET, roomID, uid, uname,
    )
    res.json({ kitToken })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
