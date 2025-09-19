import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionManager } from '../hooks/useSessionManager'
import { useAppContext } from '../hooks/useAppContext'
import { isSessionComplete } from '../utils/session-utils'
import PracticeSession from '../components/PracticeSession'
import SessionLayout from '../layouts/SessionLayout'

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedDomain } = useAppContext()
  const [sessionState, actions] = useSessionManager(selectedDomain)

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
    if (id && id !== sessionState.sessionId) {
      // TODO: Implement session loading by ID from backend
      // For now, redirect to home if no active session
      console.warn('Session loading by ID not yet implemented')
      navigate('/')
    }
  }, [id, sessionState.sessionId, navigate])

  // Redirect if no session ID
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
      sessionState={sessionState}
      actions={actions}
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
}