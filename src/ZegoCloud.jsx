import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'

const ZegoCloud = () => {
  const [value, setValue] = useState('')
  const navigate = useNavigate()

  const joinRoom = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    const safeId = trimmed
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '')
    if (!safeId) return
    navigate(`/room/${safeId}`)
  }, [navigate, value])

  const handleKeyDown = useCallback(
    (e) => { if (e.key === 'Enter') joinRoom() },
    [joinRoom],
  )

  return (
    <div className="join-container">
      <div className="join-box">
        <h2>Video Call</h2>
        <p className="subtitle">Enter a room ID to create or join a call</p>
        <input
          type="text"
          placeholder="Enter room ID"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          maxLength={64}
        />
        <button onClick={joinRoom} disabled={!value.trim()}>
          Join
        </button>
      </div>
    </div>
  )
}

export default ZegoCloud
