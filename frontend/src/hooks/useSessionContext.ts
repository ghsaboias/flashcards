// Session context hooks to avoid React refresh errors

import { useContext } from 'react'
import { createContext } from 'react'
import type { SessionState, SessionActions, SessionHelpers } from '../types/session-types'

export interface SessionContextValue {
  state: SessionState
  actions: SessionActions
  helpers: SessionHelpers
}

export const SessionContext = createContext<SessionContextValue | null>(null)

// Custom hook to use session context with error handling
export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider')
  }
  return context
}

// Individual hooks for specific parts of context (for performance)
export function useSessionState(): SessionState {
  return useSessionContext().state
}

export function useSessionActions(): SessionActions {
  return useSessionContext().actions
}

export function useSessionHelpers(): SessionHelpers {
  return useSessionContext().helpers
}

// Convenience hooks for commonly used combinations
export function useSessionStateAndActions(): [SessionState, SessionActions] {
  const { state, actions } = useSessionContext()
  return [state, actions]
}

export function useSessionWithHelpers(): {
  state: SessionState
  actions: SessionActions
  helpers: SessionHelpers
} {
  return useSessionContext()
}

// Hooks for specific state slices (to avoid re-renders)
export function useCoreSession() {
  const state = useSessionState()
  return {
    sessionId: state.sessionId,
    question: state.question,
    pinyin: state.pinyin,
    progress: state.progress,
    input: state.input,
    lastEval: state.lastEval,
    results: state.results,
    streak: state.streak,
    bestStreak: state.bestStreak
  }
}

export function useHighIntensitySettings() {
  const state = useSessionState()
  return {
    isHighIntensityMode: state.isHighIntensityMode,
    adaptiveFeedbackDuration: state.adaptiveFeedbackDuration,
    questionStartTime: state.questionStartTime
  }
}

export function useSpecialModes() {
  const state = useSessionState()
  return {
    inBrowseMode: state.inBrowseMode,
    browseRows: state.browseRows,
    browseIndex: state.browseIndex,
    browsePinyin: state.browsePinyin,
    inReviewMode: state.inReviewMode,
    reviewCards: state.reviewCards,
    reviewPosition: state.reviewPosition,
    inDrawingMode: state.inDrawingMode,
    drawingCards: state.drawingCards,
    drawingPosition: state.drawingPosition,
    drawingProgress: state.drawingProgress,
    oldFocusMode: state.oldFocusMode
  }
}

export function useDataSettings() {
  const state = useSessionState()
  return {
    sets: state.sets,
    categories: state.categories,
    selectedSet: state.selectedSet,
    selectedCategory: state.selectedCategory,
    selectedSets: state.selectedSets,
    mode: state.mode,
    diffEasy: state.diffEasy,
    diffMedium: state.diffMedium,
    diffHard: state.diffHard
  }
}

export function useViewStates() {
  const state = useSessionState()
  return {
    showSrs: state.showSrs,
    srsRows: state.srsRows,
    showStats: state.showStats,
    stats: state.stats,
    showPerformance: state.showPerformance,
    performance: state.performance,
    difficultyRows: state.difficultyRows
  }
}