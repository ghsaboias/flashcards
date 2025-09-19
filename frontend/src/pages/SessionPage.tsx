import { useEffect, useMemo, useState, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStateAndActions } from '../hooks/useSessionContext'
import { isSessionComplete } from '../utils/session-utils'
import { apiClient } from '../utils/api-client'
import PracticeSession from '../components/PracticeSession'
import SessionLayout from '../layouts/SessionLayout'
import LoadingSpinner from '../components/LoadingSpinner'

const SessionPage = memo(function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sessionState, actions] = useSessionStateAndActions()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Computed values
  const canAnswer = useMemo(() => (
    !!sessionState.sessionId && !!sessionState.question
  ), [sessionState.sessionId, sessionState.question])

  const sessionComplete = useMemo(() =>
    isSessionComplete(sessionState.progress, sessionState.results)
  , [sessionState.progress, sessionState.results])

  // Navigate to completion page when session is done
  useEffect(() => {
    if (sessionComplete && sessionState.sessionId) {
      navigate(`/complete/${sessionState.sessionId}`)
    }
  }, [sessionComplete, sessionState.sessionId, navigate])

  // Load session if ID doesn't match current session
  useEffect(() => {
    const loadSession = async () => {
      if (!id) {
        setError('No session ID provided')
        setLoading(false)
        return
      }

      // If we already have the correct session loaded, don't reload
      if (id === sessionState.sessionId && sessionState.question) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Load session state from backend
        const sessionData = await apiClient.getSession(id)

        if (sessionData.done) {
          // Session is complete, redirect to completion page
          navigate(`/complete/${id}`)
          return
        }

        // Restore session state using the session manager
        await actions.restoreSessionFromBackend(id, sessionData)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load session:', error)
        setError('Session not found or expired')
        setLoading(false)
        // Don't auto-redirect on error, let user decide
      }
    }

    loadSession()
  }, [id, sessionState.sessionId, sessionState.question, navigate, actions])

  // Show loading state
  if (loading) {
    return (
      <SessionLayout>
        <LoadingSpinner
          size="large"
          text="Loading session..."
        >
          <p>Preparing your practice session...</p>
        </LoadingSpinner>
      </SessionLayout>
    )
  }

  // Show error state
  if (error) {
    return (
      <SessionLayout>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'var(--panel)',
          borderRadius: '8px',
          border: '1px solid var(--bad)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: 'var(--bad)', marginBottom: '16px' }}>Session Error</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()} className="btn-secondary">
              🔄 Retry
            </button>
            <button onClick={() => navigate('/')} className="btn-primary">
              🏠 Start New Session
            </button>
          </div>
        </div>
      </SessionLayout>
    )
  }

  // Redirect if no session ID after loading
  if (!sessionState.sessionId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No active session found.</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Start New Session
        </button>
      </div>
    )
  }

  return (
    <SessionLayout
      className={sessionState.isHighIntensityMode ? 'high-intensity' : ''}
    >
      <div className="session-content">
        <PracticeSession
          sessionState={sessionState}
          actions={actions}
          canAnswer={canAnswer}
          speak={() => {}} // Will be provided by SessionLayout
        />
      </div>
    </SessionLayout>
  )
})

export default SessionPage