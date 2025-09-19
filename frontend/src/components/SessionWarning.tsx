// Session warning components for unsaved changes and navigation protection

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSessionStateAndActions } from '../hooks/useSessionContext'
import { useNavigationGuardContext } from '../hooks/useNavigationGuardContext'

// Warning banner for active sessions
export function SessionWarningBanner() {
  const [sessionState] = useSessionStateAndActions()
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Show banner when there's an active session and user is not on session page
  const hasActiveSession = !!(
    sessionState.sessionId &&
    sessionState.question &&
    sessionState.progress?.current < sessionState.progress?.total
  )

  const isOnSessionPage = location.pathname.startsWith('/session/')
  const shouldShowBanner = hasActiveSession && !isOnSessionPage && !isDismissed

  useEffect(() => {
    setIsVisible(shouldShowBanner)
  }, [shouldShowBanner])

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(90deg, #f59e0b, #d97706)',
      color: 'white',
      padding: '12px 16px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontSize: '14px',
      fontWeight: '500'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>⚠️</span>
        <span>
          Active session in progress ({sessionState.progress?.current}/{sessionState.progress?.total}) -
          {' '}
          <a
            href={`/session/${sessionState.sessionId}`}
            style={{ color: 'white', textDecoration: 'underline' }}
          >
            Return to session
          </a>
        </span>
      </div>
      <button
        onClick={() => setIsDismissed(true)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '4px',
          lineHeight: 1
        }}
        aria-label="Dismiss warning"
      >
        ×
      </button>
    </div>
  )
}

// Modal for navigation confirmation during active sessions
interface NavigationConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  destination?: string
}

export function NavigationConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  destination = 'another page'
}: NavigationConfirmModalProps) {
  const [sessionState] = useSessionStateAndActions()
  const { saveSession } = useNavigationGuardContext()

  if (!isOpen) return null

  const handleConfirmWithSave = () => {
    saveSession()
    onConfirm()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--panel)',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          color: 'var(--warning)'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <h3 style={{ margin: 0, color: 'var(--text)' }}>Active Practice Session</h3>
        </div>

        <p style={{ color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          You have an active practice session with{' '}
          <strong style={{ color: 'var(--text)' }}>
            {sessionState.progress?.current}/{sessionState.progress?.total} questions completed
          </strong>.
          {' '}Navigating to {destination} will save your progress for later.
        </p>

        <div style={{
          background: 'var(--background)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span>💾</span>
            <strong style={{ color: 'var(--text)' }}>Auto-Save Enabled</strong>
          </div>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
            Your session progress will be automatically saved and can be restored later.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{ padding: '12px 24px' }}
          >
            Stay in Session
          </button>
          <button
            onClick={handleConfirmWithSave}
            className="btn-primary"
            style={{ padding: '12px 24px' }}
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// Session recovery notification when returning to app
interface SessionRecoveryNotificationProps {
  sessionId: string
  onRestore: () => void
  onDismiss: () => void
}

export function SessionRecoveryNotification({
  onRestore,
  onDismiss
}: SessionRecoveryNotificationProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'var(--panel)',
      border: '1px solid var(--accent)',
      borderRadius: '12px',
      padding: '20px',
      maxWidth: '380px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      zIndex: 1500,
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '20px' }}>🔄</span>
        <h4 style={{ margin: 0, color: 'var(--text)' }}>Session Available</h4>
      </div>

      <p style={{ color: 'var(--muted)', margin: '0 0 16px 0', fontSize: '14px' }}>
        You have a saved practice session that can be restored. Continue where you left off?
      </p>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onDismiss}
          className="btn-secondary"
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          Dismiss
        </button>
        <button
          onClick={onRestore}
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          Restore Session
        </button>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

