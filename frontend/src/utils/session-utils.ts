// Session state utilities to eliminate repetitive state management logic

import type { SessionState } from '../types/session-types'
import type { SessionResponse, ResultCard } from '../types/api-types'

// Create empty initial state objects
export function createEmptySessionState(): SessionState {
  return {
    // Core session data
    sessionId: "",
    question: "",
    pinyin: "",
    progress: { current: 0, total: 0 },
    input: "",
    lastEval: null,
    results: [],
    streak: 0,
    bestStreak: 0,
    sessionStartTime: null,
    currentCardSet: "",

    // High-intensity mode
    isHighIntensityMode: true,
    adaptiveFeedbackDuration: 2000,
    questionStartTime: 0,

    // Special modes
    inBrowseMode: false,
    browseRows: [],
    browseIndex: 0,
    browsePinyin: "",
    inReviewMode: false,
    reviewCards: [],
    reviewPosition: 0,
    inDrawingMode: false,
    drawingCards: [],
    drawingPosition: 0,
    drawingProgress: { current: 0, total: 0 },
    oldFocusMode: false,

    // Data and settings
    sets: [],
    categories: [],
    selectedSet: "",
    selectedCategory: "",
    selectedSets: [],
    mode: 'set',
    diffEasy: false,
    diffMedium: false,
    diffHard: true,

    // Views
    showSrs: true,
    srsRows: [],
    showStats: true,
    stats: null,
    showPerformance: false,
    performance: null,
    difficultyRows: null
  }
}

// Create partial state reset objects for different scenarios
export function createCoreSessionReset(): Partial<SessionState> {
  return {
    sessionId: "",
    question: "",
    pinyin: "",
    progress: { current: 0, total: 0 },
    input: "",
    lastEval: null,
    results: [],
    streak: 0,
    bestStreak: 0,
    questionStartTime: 0,
    sessionStartTime: null,
    currentCardSet: ""
  }
}

export function createSpecialModesReset(): Partial<SessionState> {
  return {
    inBrowseMode: false,
    browseRows: [],
    browseIndex: 0,
    browsePinyin: "",
    inReviewMode: false,
    reviewCards: [],
    reviewPosition: 0,
    inDrawingMode: false,
    drawingCards: [],
    drawingPosition: 0,
    drawingProgress: { current: 0, total: 0 },
  }
}

export function createViewStatesReset(): Partial<SessionState> {
  return {
    showSrs: false,
    srsRows: [],
    showStats: false,
    stats: null,
    showPerformance: false,
    performance: null
  }
}

// Comprehensive session reset
export function resetSessionUI(state: SessionState): SessionState {
  return {
    ...state,
    ...createCoreSessionReset(),
    ...createSpecialModesReset(),
    ...createViewStatesReset()
  }
}

// Update session state from API response
export function updateSessionFromResponse(
  currentState: SessionState,
  response: SessionResponse
): Partial<SessionState> {
  const updates: Partial<SessionState> = {}

  // Update session ID if provided
  if (response.session_id) {
    updates.sessionId = response.session_id
  }

  // Update question and progress
  if (response.card) {
    updates.question = response.card.question
    updates.pinyin = response.card.pinyin || ""
    updates.currentCardSet = response.card.set_name || ""
  }
  updates.progress = response.progress

  // Handle evaluation feedback
  if (response.evaluation) {
    updates.lastEval = {
      correct: response.evaluation.correct,
      correct_answer: response.evaluation.correct_answer
    }

    // Update streak
    if (response.evaluation.correct) {
      const newStreak = currentState.streak + 1
      updates.streak = newStreak
      updates.bestStreak = Math.max(currentState.bestStreak, newStreak)
    } else {
      updates.streak = 0
    }
  }

  // Handle session completion
  if (response.done) {
    updates.question = ""
    if (response.results) {
      updates.results = response.results
    }
  }

  return updates
}

// Calculate session summary statistics
export function calculateSessionStats(results: ResultCard[]): {
  total: number
  correct: number
  incorrect: number
  accuracy: number
} {
  const total = results.length
  const correct = results.filter(r => r.correct).length
  const incorrect = total - correct
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return { total, correct, incorrect, accuracy }
}

// Extract incorrect results for review
export function getIncorrectResults(results: ResultCard[]): ResultCard[] {
  return results.filter(r => !r.correct)
}

// Convert results to review cards format
export function resultsToReviewCards(results: ResultCard[]): Array<{
  question: string
  pinyin?: string
  correct_answer: string
}> {
  return results.map(r => ({
    question: r.question,
    pinyin: r.pinyin,
    correct_answer: r.correct_answer
  }))
}

// Progress calculation utilities
export function calculateProgressPercent(progress: { current: number; total: number }): number {
  return progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
}

export function isSessionComplete(
  progress: { current: number; total: number },
  results: ResultCard[]
): boolean {
  return progress.total > 0 &&
         progress.current >= progress.total &&
         results.length > 0
}

// Difficulty classification utility
export function classifyDifficulty(row: { total: number; accuracy: number }): 'easy' | 'medium' | 'hard' {
  const attempts = row.total || 0
  const accuracy = row.accuracy || 0

  if (attempts <= 10) return 'hard'
  if (accuracy > 90) return 'easy'
  if (accuracy > 80) return 'medium'
  return 'hard'
}

// Count cards by difficulty
export function countByDifficulty(rows: Array<{ total: number; accuracy: number }>): Record<'easy' | 'medium' | 'hard', number> {
  const counts: Record<'easy' | 'medium' | 'hard', number> = { easy: 0, medium: 0, hard: 0 }

  for (const row of rows) {
    const difficulty = classifyDifficulty(row)
    counts[difficulty]++
  }

  return counts
}

// Multi-set selection helpers
export function addSetToSelection(currentSets: string[], setName: string): string[] {
  if (!currentSets.includes(setName)) {
    return [...currentSets, setName]
  }
  return currentSets
}

export function removeSetFromSelection(currentSets: string[], setName: string): string[] {
  return currentSets.filter(s => s !== setName)
}

// Validation helpers
export function canStartByDifficulty(settings: { diffEasy: boolean; diffMedium: boolean; diffHard: boolean }): boolean {
  return settings.diffEasy || settings.diffMedium || settings.diffHard
}

export function hasSelectedData(mode: 'set' | 'category' | 'multi-set', data: {
  selectedSet: string
  selectedCategory: string
  selectedSets: string[]
}): boolean {
  switch (mode) {
    case 'set':
      return !!data.selectedSet
    case 'category':
      return !!data.selectedCategory
    case 'multi-set':
      return data.selectedSets.length > 0
    default:
      return false
  }
}