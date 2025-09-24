// Simple session recovery component
// Replaces complex SessionWarning system with lightweight recovery prompt

import { useState, useEffect } from 'react'
import { useSessionPersistence } from '../hooks/useSessionPersistence'

export function SessionRecoveryPrompt() {
  const { checkForPreviousSession, resumeSession, clearSavedSession } = useSessionPersistence()
  const [previousSession, setPreviousSession] = useState<{sessionId: string, timestamp: number} | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const session = checkForPreviousSession()
    if (session) {
      setPreviousSession(session)
      setIsVisible(true)
    }
  }, [checkForPreviousSession])

  const handleResume = () => {
    if (previousSession) {
      resumeSession(previousSession.sessionId)
    }
    setIsVisible(false)
  }

  const handleDismiss = () => {
    clearSavedSession()
    setIsVisible(false)
  }

  if (!isVisible || !previousSession) return null

  const minutesAgo = Math.floor((Date.now() - previousSession.timestamp) / 60000)

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'var(--panel)',
      border: '1px solid var(--accent)',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxWidth: '300px'
    }}>
      <div style={{ marginBottom: '12px' }}>
        <strong>Resume Session?</strong>
      </div>
      <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
        You have an unfinished practice session from {minutesAgo} minute{minutesAgo !== 1 ? 's' : ''} ago.
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleResume}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Resume
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            color: 'var(--muted)',
            border: '1px solid var(--muted)',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Start Fresh
        </button>
      </div>
    </div>
  )
}