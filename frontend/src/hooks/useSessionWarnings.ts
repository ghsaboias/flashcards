// Hook to manage session warnings and recovery

import { useState, useEffect } from 'react'
import { useNavigationGuardContext } from './useNavigationGuardContext'

export function useSessionWarnings() {
  const { navigateWithGuard, clearSession } = useNavigationGuardContext()
  const [showRecoveryNotification, setShowRecoveryNotification] = useState(false)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)

  // Check for saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem('flashcards_session_backup')
    if (saved) {
      try {
        const sessionBackup = JSON.parse(saved)
        const savedAge = Date.now() - sessionBackup.savedAt

        // Show recovery notification for sessions less than 1 hour old
        if (savedAge < 60 * 60 * 1000) {
          setSavedSessionId(sessionBackup.sessionId)
          setShowRecoveryNotification(true)
        } else {
          localStorage.removeItem('flashcards_session_backup')
        }
      } catch {
        localStorage.removeItem('flashcards_session_backup')
      }
    }
  }, [])

  const handleRestoreSession = async () => {
    if (savedSessionId) {
      await navigateWithGuard(`/session/${savedSessionId}`, { force: true })
      setShowRecoveryNotification(false)
    }
  }

  const handleDismissRecovery = () => {
    clearSession()
    setShowRecoveryNotification(false)
  }

  return {
    showRecoveryNotification,
    savedSessionId,
    handleRestoreSession,
    handleDismissRecovery
  }
}