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

    // UI preferences
    showPinyin: true,


    // Data and settings
    sets: [],
    selectedSets: [],
    diffEasy: false,
    diffMedium: false,
    diffHard: true,

    // Views
    statsMode: 'accuracy',
    srsRows: [],
    stats: null,
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
    // No legacy modes to reset
  }
}

export function createViewStatesReset(): Partial<SessionState> {
  return {
    statsMode: null,
    srsRows: [],
    stats: null,
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

export function validateSessionStart(data: { selectedSets: string[] }): boolean {
  return data.selectedSets.length > 0
}