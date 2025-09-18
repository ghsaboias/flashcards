// Session context provider component

import type { ReactNode } from 'react'
import type { SessionState, SessionActions, SessionHelpers } from '../types/session-types'
import { validateUserAnswer } from '../utils/text-utils'
import { hasChinese } from '../utils/pinyin'
import { humanizeSetLabel, humanizeCategoryLabel, formatMultiSetLabel } from '../utils/hsk-label-utils'
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
  // Create consolidated helpers object
  const helpers: SessionHelpers = {
    speak,
    validateAnswer: validateUserAnswer,
    hasChinese,
    formatProgress: (progress: Progress) => `${progress.current}/${progress.total}`,
    humanizeSetLabel,
    humanizeCategoryLabel,
    getMultiSetLabel: () => formatMultiSetLabel(sessionState.selectedSets)
  }

  const contextValue: SessionContextValue = {
    state: sessionState,
    actions,
    helpers
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}

// Note: Session context hooks are available in '../hooks/useSessionContext'