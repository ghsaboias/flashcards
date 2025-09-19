// Navigation guard hook for session protection and browser integration

import { useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSessionStateAndActions } from './useSessionContext'
import { apiClient } from '../utils/api-client'

interface NavigationGuardConfig {
  enabled?: boolean
  autoSave?: boolean
  confirmMessage?: string
}

interface NavigationGuardReturn {
  promptNavigation: (to: string, options?: { force?: boolean }) => Promise<boolean>
  saveSessionState: () => void
  restoreSessionState: () => Promise<void>
  clearSessionState: () => void
}

const SESSION_STORAGE_KEY = 'flashcards_session_backup'
const NAVIGATION_CONFIRMATION_MESSAGE = 'You have an active practice session. Leaving now will save your progress. Continue?'

export function useNavigationGuard(config: NavigationGuardConfig = {}): NavigationGuardReturn {
  const {
    enabled = true,
    autoSave = true,
    confirmMessage = NAVIGATION_CONFIRMATION_MESSAGE
  } = config

  const navigate = useNavigate()
  const location = useLocation()
  const [sessionState, actions] = useSessionStateAndActions()
  const isNavigatingRef = useRef(false)

  // Determine if session is active and needs protection
  const hasActiveSession = !!(
    sessionState.sessionId &&
    sessionState.question &&
    sessionState.progress?.current < sessionState.progress?.total
  )

  // Save critical session state to localStorage
  const saveSessionState = useCallback(() => {
    if (!hasActiveSession) return

    const sessionBackup = {
      sessionId: sessionState.sessionId,
      question: sessionState.question,
      pinyin: sessionState.pinyin,
      progress: sessionState.progress,
      input: sessionState.input,
      currentCardSet: sessionState.currentCardSet,
      isHighIntensityMode: sessionState.isHighIntensityMode,
      showPinyin: sessionState.showPinyin,
      questionStartTime: sessionState.questionStartTime,
      savedAt: Date.now(),
      route: location.pathname
    }

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionBackup))
  }, [hasActiveSession, sessionState, location.pathname])

  // Restore session state from localStorage
  const restoreSessionState = useCallback(async () => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!saved) return

      const sessionBackup = JSON.parse(saved)
      const savedAge = Date.now() - sessionBackup.savedAt

      // Don't restore sessions older than 1 hour
      if (savedAge > 60 * 60 * 1000) {
        localStorage.removeItem(SESSION_STORAGE_KEY)
        return
      }

      // Verify session still exists on backend
      const backendSession = await apiClient.getSession(sessionBackup.sessionId)
      if (backendSession.done) {
        // Session was completed elsewhere, navigate to completion
        localStorage.removeItem(SESSION_STORAGE_KEY)
        navigate(`/complete/${sessionBackup.sessionId}`)
        return
      }

      // Restore session state
      await actions.restoreSessionFromBackend(sessionBackup.sessionId, backendSession)

      // Restore UI preferences
      actions.setIsHighIntensityMode(sessionBackup.isHighIntensityMode)
      actions.setShowPinyin(sessionBackup.showPinyin)
      actions.setInput(sessionBackup.input)

      // Navigate to appropriate session page if not already there
      if (location.pathname !== `/session/${sessionBackup.sessionId}`) {
        navigate(`/session/${sessionBackup.sessionId}`)
      }

      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to restore session state:', error)
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [actions, navigate, location.pathname])

  // Clear saved session state
  const clearSessionState = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }, [])

  // Controlled navigation with confirmation and auto-save
  const promptNavigation = useCallback(async (to: string, options: { force?: boolean } = {}): Promise<boolean> => {
    const { force = false } = options

    if (!enabled || !hasActiveSession || force || isNavigatingRef.current) {
      navigate(to)
      return true
    }

    // Auto-save session before showing confirmation
    if (autoSave) {
      saveSessionState()
    }

    // Show confirmation dialog
    const shouldNavigate = window.confirm(confirmMessage)

    if (shouldNavigate) {
      isNavigatingRef.current = true
      navigate(to)
      return true
    }

    return false
  }, [enabled, hasActiveSession, autoSave, saveSessionState, confirmMessage, navigate])

  // Handle browser beforeunload event
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasActiveSession) {
        // Auto-save session state
        if (autoSave) {
          saveSessionState()
        }

        // Show browser confirmation dialog
        event.preventDefault()
        event.returnValue = confirmMessage
        return confirmMessage
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, hasActiveSession, autoSave, saveSessionState, confirmMessage])

  // Handle browser popstate (back/forward buttons)
  useEffect(() => {
    if (!enabled) return

    const handlePopState = () => {
      if (hasActiveSession && autoSave) {
        saveSessionState()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [enabled, hasActiveSession, autoSave, saveSessionState])

  // Auto-save periodically during active sessions
  useEffect(() => {
    if (!enabled || !hasActiveSession || !autoSave) return

    const interval = setInterval(saveSessionState, 30000) // Save every 30 seconds
    return () => clearInterval(interval)
  }, [enabled, hasActiveSession, autoSave, saveSessionState])

  // Try to restore session state on mount
  useEffect(() => {
    // Only restore on initial load, not on every route change
    if (location.key === 'default') {
      restoreSessionState()
    }
  }, [location.key, restoreSessionState])

  return {
    promptNavigation,
    saveSessionState,
    restoreSessionState,
    clearSessionState
  }
}