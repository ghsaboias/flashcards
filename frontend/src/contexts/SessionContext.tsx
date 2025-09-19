// Session context provider component

import { useMemo, type ReactNode } from 'react'
import type { SessionState, SessionActions, SessionHelpers } from '../types/session-types'
import { validateUserAnswer } from '../utils/text-utils'
import { hasChinese } from '../utils/pinyin'
import { humanizeSetLabel, formatMultiSetLabel } from '../utils/hsk-label-utils'
import type { Progress } from '../types/api-types'
import { SessionContext, type SessionContextValue } from '../hooks/useSessionContext'

// Props for the provider
interface SessionProviderProps {
  children: ReactNode
  sessionState: SessionState
  actions: SessionActions
  speak: (text: string) => void
}

export function SessionProvider({
  children,
  sessionState,
  actions,
  speak
}: SessionProviderProps) {
  // Memoize helpers object to prevent unnecessary re-renders
  const helpers: SessionHelpers = useMemo(() => ({
    speak,
    validateAnswer: validateUserAnswer,
    hasChinese,
    formatProgress: (progress: Progress) => `${progress.current}/${progress.total}`,
    humanizeSetLabel,
    getMultiSetLabel: () => formatMultiSetLabel(sessionState.selectedSets)
  }), [speak, sessionState.selectedSets])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: SessionContextValue = useMemo(() => ({
    state: sessionState,
    actions,
    helpers
  }), [sessionState, actions, helpers])

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}

// Note: Session context hooks are available in '../hooks/useSessionContext'