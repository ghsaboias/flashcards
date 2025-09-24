// Simple session persistence for personal learning app
// Replaces complex navigation guard system with lightweight session recovery

import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStateAndActions } from './useSessionContext'

interface SessionBackup {
  sessionId: string
  timestamp: number
  question?: string
  progress?: {
    current: number
    total: number
  }
}

const SESSION_STORAGE_KEY = 'flashcards_session_backup'
const SESSION_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour

export function useSessionPersistence() {
  const [sessionState] = useSessionStateAndActions()
  const navigate = useNavigate()

  // Save session state when session is active
  const saveSession = useCallback(() => {
    if (sessionState.sessionId && sessionState.question) {
      const backup: SessionBackup = {
        sessionId: sessionState.sessionId,
        timestamp: Date.now(),
        question: sessionState.question,
        progress: sessionState.progress
      }
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(backup))
    }
  }, [sessionState.sessionId, sessionState.question, sessionState.progress])

  // Check for and restore previous session
  const checkForPreviousSession = useCallback((): SessionBackup | null => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY)
      if (saved) {
        const backup: SessionBackup = JSON.parse(saved)
        // Only restore if session is less than 1 hour old
        if (Date.now() - backup.timestamp < SESSION_TIMEOUT_MS) {
          return backup
        } else {
          // Clean up old session
          localStorage.removeItem(SESSION_STORAGE_KEY)
        }
      }
    } catch (error) {
      console.warn('Failed to check for previous session:', error)
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
    return null
  }, [])

  // Clear saved session
  const clearSavedSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }, [])

  // Resume session navigation
  const resumeSession = useCallback((sessionId: string) => {
    navigate(`/session/${sessionId}`)
  }, [navigate])

  // Auto-save session state periodically
  useEffect(() => {
    if (sessionState.sessionId && sessionState.question) {
      saveSession()
    }
  }, [sessionState.sessionId, sessionState.question, sessionState.progress, saveSession])

  return {
    saveSession,
    checkForPreviousSession,
    clearSavedSession,
    resumeSession
  }
}