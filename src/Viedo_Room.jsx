import { useEffect, useRef, useState, useCallback } from 'react'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'
import { useParams } from 'react-router-dom'
import './App.css'

// ─── Credentials ─────────────────────────────────────────────────────────────
// Reads from .env first, falls back to defaults.
// ⚠️  The default values are DEMO credentials — they will cause error 20021.
//     Get your own free credentials at https://console.zegocloud.com
//     then create a .env file:
//       VITE_ZEGO_APP_ID=your_app_id
//       VITE_ZEGO_SERVER_SECRET=your_server_secret
const APP_ID        = Number(import.meta.env.VITE_ZEGO_APP_ID)       || 528709255
const SERVER_SECRET =        import.meta.env.VITE_ZEGO_SERVER_SECRET  || '3b233c20ff7129866b08e219a4ff7943'
const USING_DEMO_CREDS = APP_ID === 528709255
// ─────────────────────────────────────────────────────────────────────────────

const Viedo_Room = () => {
  const { id } = useParams()

  const containerRef = useRef(null)
  const zpRef        = useRef(null)
  const cleanupRef   = useRef(null)
  const initGenRef   = useRef(0)
  const joinedRef    = useRef(false)

  // ── ROOT BUG FIX ────────────────────────────────────────────────────────
  // Previously: ZegoUIKitPrebuilt.create() was called inside initSdk() which
  // ran on EVERY mount. The SDK opens a WebSocket to ZegoCloud the moment
  // create() is called — BEFORE the user ever clicks Join. This produced the
  // flood of error-20021 entries (one batch per mount/remount/StrictMode
  // double-invoke). Each failed attempt created a new orphaned SDK instance
  // that kept retrying in the background every few seconds.
  //
  // Fix: initSdk() ONLY fetches / generates the kitToken and stores it here.
  //      ZegoUIKitPrebuilt.create() + joinRoom() are called TOGETHER inside
  //      handleJoin(), which only runs when the user explicitly clicks the button.
  // ────────────────────────────────────────────────────────────────────────
  const kitTokenRef = useRef(null)

  const [userName,  setUserName]  = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [sdkReady,  setSdkReady]  = useState(false)
  const [joined,    setJoined]    = useState(false)
  const [error,     setError]     = useState('')

  // Mirror joined into a ref so the setTimeout inside handleJoin
  // reads the current value, not the stale closure value.
  const setJoinedSync = useCallback((val) => {
    joinedRef.current = val
    setJoined(val)
  }, [])

  const shareUrl = id ? `${window.location.origin}/room/${id}` : ''

  // ── initSdk — token only, zero SDK connections ───────────────────────────
  const initSdk = useCallback(async () => {
    const gen = ++initGenRef.current

    // Tear down any previous live ZP instance (from a prior join attempt)
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null }
    if (containerRef.current) containerRef.current.innerHTML = ''

    setSdkReady(false)
    kitTokenRef.current = null

    const userID     = `user_${Date.now()}`
    const randomName = `User_${Math.floor(Math.random() * 9000) + 1000}`
    // Preserve whatever the user has already typed in the name field
    setUserName((prev) => prev || randomName)

    let kitToken = null

    // 1) Try the token server.
    //    In dev  → VITE_TOKEN_SERVER_URL=http://localhost:3001  →  hits /token
    //    In prod (combined server) → VITE_TOKEN_SERVER_URL not set  →  hits /api/token same-origin
    //    In prod (separate server) → VITE_TOKEN_SERVER_URL=https://api.example.com  →  hits /token
    const TOKEN_BASE = (import.meta.env.VITE_TOKEN_SERVER_URL || '').replace(/\/$/, '')
    const TOKEN_URL  = TOKEN_BASE ? `${TOKEN_BASE}/token` : '/api/token'
    try {
      const resp = await fetch(
        `${TOKEN_URL}` +
        `?roomID=${encodeURIComponent(id)}` +
        `&userID=${encodeURIComponent(userID)}` +
        `&userName=${encodeURIComponent(randomName)}`,
      )
      if (resp.ok) {
        const body = await resp.json()
        if (body?.kitToken) kitToken = body.kitToken
      }
    } catch {
      // Token server not reachable — fall through to client-side generation (dev only)
    }

    // 2) Client-side fallback (needs valid APP_ID + SERVER_SECRET in .env)
    if (!kitToken) {
      kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        APP_ID, SERVER_SECRET, id, userID, randomName,
      )
    }

    // If a newer initSdk call started while we were awaiting the fetch, discard
    if (gen !== initGenRef.current) return

    kitTokenRef.current = kitToken
    setSdkReady(true)
  }, [id])

  // ── Mount / route-change effect ──────────────────────────────────────────
  useEffect(() => {
    if (!id) return

    initSdk().catch((err) =>
      setError('Token preparation failed: ' + (err?.message ?? String(err)))
    )

    return () => {
      initGenRef.current++                           // cancel in-flight initSdk
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null }
      setSdkReady(false)
      setJoinedSync(false)
    }
  }, [id, initSdk, setJoinedSync])

  // ── handleJoin ───────────────────────────────────────────────────────────
  const handleJoin = useCallback(async () => {
    if (isJoining || joined) return

    if (!kitTokenRef.current || !containerRef.current) {
      setError('Still initialising — please wait a moment and try again.')
      return
    }

    setError('')
    setIsJoining(true)

    try {
      // Camera / mic preflight — shows a clear message instead of a cryptic SDK error
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        stream.getTracks().forEach((t) => t.stop())
      } catch (mediaErr) {
        setError(
          `Camera / microphone access denied (${mediaErr?.name ?? 'MediaError'}).\n` +
          `Click the 🔒 icon in the address bar, allow access, then click Retry.`,
        )
        setIsJoining(false)
        return
      }

      // Create the SDK instance + join in one step — NO background connections
      const zp = ZegoUIKitPrebuilt.create(kitTokenRef.current)
      zpRef.current = zp
      cleanupRef.current = () => {
        try { zp.destroy?.() } catch { /* ignore */ }
        zpRef.current = null
      }

      zp.joinRoom({
        container:       containerRef.current,
        sharedLinks:     [{ name: 'Invite link', url: shareUrl }],
        scenario:        { mode: ZegoUIKitPrebuilt.OneOnOneCall },
        userName:        userName.trim() || 'Guest',
        showPreJoinView: false,            // we supply our own join screen
        onJoinRoom:  () => setJoinedSync(true),
        onLeaveRoom: () => {
          setJoinedSync(false)
          if (containerRef.current) containerRef.current.innerHTML = ''
          // Regenerate the token so the user can join again cleanly
          initSdk().catch((err) =>
            setError('Reinitialise failed: ' + (err?.message ?? String(err)))
          )
        },
      })

      // Wait up to 4 s for the SDK to render into the container.
      // If the container is still empty, the connection failed.
      await new Promise((resolve) => setTimeout(resolve, 4000))

      if (!joinedRef.current) {
        if (containerRef.current?.childElementCount > 0) {
          // SDK rendered but onJoinRoom callback wasn't fired — mark as joined anyway
          setJoinedSync(true)
        } else {
          // Nothing rendered — connection failed (auth error, network, etc.)
          if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null }
          if (containerRef.current) containerRef.current.innerHTML = ''
          kitTokenRef.current = null
          setSdkReady(false)

          setError(
            'Could not connect to ZegoCloud after 4 seconds.\n\n' +
            'Most likely cause: invalid AppID or ServerSecret.\n' +
            '➜  Sign up free at console.zegocloud.com\n' +
            '➜  Create a project and copy your AppID + ServerSecret\n' +
            '➜  Add them to a .env file in the project root:\n\n' +
            '   VITE_ZEGO_APP_ID=your_app_id\n' +
            '   VITE_ZEGO_SERVER_SECRET=your_secret\n\n' +
            'Then restart the dev server (npm run dev) and try again.',
          )
        }
      }
    } catch (err) {
      console.error('joinRoom error:', err)
      setError(`Failed to join: ${err?.message ?? String(err)}`)
    } finally {
      setIsJoining(false)
    }
  }, [isJoining, joined, shareUrl, userName, initSdk, setJoinedSync])

  // ── handleRetry ──────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setError('')
    setJoinedSync(false)
    initSdk().catch((err) =>
      setError('Retry failed: ' + (err?.message ?? String(err)))
    )
  }, [initSdk, setJoinedSync])

  // ── copyLink ─────────────────────────────────────────────────────────────
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = shareUrl
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
  }, [shareUrl])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="room-root">
      {/* ZegoUIKit renders its entire video-call UI into this div */}
      <div ref={containerRef} className="room-container" />

      {!joined && (
        <div className="join-overlay">
          <div className="join-panel">
            <h3>Join Room</h3>
            <p className="room-id-label">
              Room: <code>{id}</code>
            </p>

            {/* Credential warning — shown when using the default demo values */}
            {USING_DEMO_CREDS && (
              <div className="cred-warning">
                <strong>⚠️ Demo credentials active</strong>
                <p>
                  These will fail with error 20021. Get your own free credentials at{' '}
                  <a
                    href="https://console.zegocloud.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    console.zegocloud.com
                  </a>{' '}
                  then add them to <code>.env</code>:
                </p>
                <pre className="cred-snippet">
                  {`VITE_ZEGO_APP_ID=your_app_id\nVITE_ZEGO_SERVER_SECRET=your_secret`}
                </pre>
              </div>
            )}

            <label className="input-label" htmlFor="username-input">
              Your name
            </label>
            <input
              id="username-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sdkReady && !isJoining) handleJoin()
              }}
              placeholder="Enter your name"
              disabled={isJoining}
              maxLength={32}
              autoComplete="off"
            />

            <button
              className="join-btn"
              onClick={handleJoin}
              disabled={isJoining || !sdkReady}
            >
              {isJoining ? 'Joining…' : sdkReady ? 'Join Room' : 'Initialising…'}
            </button>

            {shareUrl && !isJoining && (
              <button className="copy-btn" onClick={copyLink}>
                Copy Invite Link
              </button>
            )}

            {error && (
              <div className="join-error">
                <pre className="error-pre">{error}</pre>
                <button className="retry-btn" onClick={handleRetry}>
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Viedo_Room
