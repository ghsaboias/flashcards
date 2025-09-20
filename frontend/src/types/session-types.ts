// Consolidated session state types to eliminate massive interface duplication

import type {
  Progress,
  ResultCard,
  SrsRow,
  StatsPayload,
  PerformancePayload,
  StatRow,
  SessionResponse,
  NewCardsDetectionResponse
} from './api-types'

// Core session data
export interface CoreSessionData {
  sessionId: string
  question: string
  pinyin: string
  progress: Progress
  input: string
  lastEval: { correct: boolean; correct_answer: string } | null
  results: ResultCard[]
  streak: number
  bestStreak: number
  sessionStartTime: number | null
  currentCardSet: string
}

// High-intensity mode settings
export interface HighIntensitySettings {
  isHighIntensityMode: boolean
  adaptiveFeedbackDuration: number
  questionStartTime: number
}

// UI preferences
export interface UIPreferences {
  showPinyin: boolean
}


// Data selection and settings
export interface DataSettings {
  sets: string[]
  selectedSets: string[]

  // Difficulty filters
  diffEasy: boolean
  diffMedium: boolean
  diffHard: boolean
}

// View states for stats and performance
export interface ViewStates {
  statsMode: 'srs' | 'accuracy' | 'performance' | null
  srsRows: SrsRow[]
  stats: StatsPayload | null
  performance: PerformancePayload | null
  difficultyRows: StatRow[] | null
  newCardsDetection: NewCardsDetectionResponse | null
}

// Consolidated session state
export interface SessionState extends
  CoreSessionData,
  HighIntensitySettings,
  UIPreferences,
  DataSettings,
  ViewStates {}

// Session action categories
export interface CoreSessionActions {
  resetSessionUI: () => void
  beginAutoSession: (domainId?: string, skipNewCardCheck?: boolean, excludeNewCards?: boolean) => Promise<SessionResponse | NewCardsDetectionResponse | undefined>
  beginMultiSetSession: () => Promise<SessionResponse | undefined>
  submitAnswer: () => Promise<void>
  restoreSessionFromBackend: (sessionId: string, sessionData: import('./api-types').SessionResponse) => Promise<void>
}

export interface DifficultyActions {
  beginMultiSetDifficult: () => Promise<SessionResponse | undefined>
}

export interface SrsActions {
  beginMultiSetSrs: () => Promise<SessionResponse | undefined>
}

export interface SpecialModeActions {
  // Review mode
  beginReviewIncorrect: () => Promise<SessionResponse | undefined>
}

export interface ViewActions {
  setStatsMode: (mode: 'srs' | 'accuracy' | 'performance' | null) => void
}

export interface SetterActions {
  setInput: (input: string) => void
  setSelectedSets: (sets: string[]) => void
  setIsHighIntensityMode: (enabled: boolean) => void
  setShowPinyin: (enabled: boolean) => void
  setDiffEasy: (enabled: boolean) => void
  setDiffMedium: (enabled: boolean) => void
  setDiffHard: (enabled: boolean) => void
}

export interface MultiSetActions {
  addSetToSelection: (setName: string) => void
  removeSetFromSelection: (setName: string) => void
}

// Consolidated session actions
export interface SessionActions extends
  CoreSessionActions,
  DifficultyActions,
  SrsActions,
  SpecialModeActions,
  ViewActions,
  SetterActions,
  MultiSetActions {}

// Common helper functions used across components
export interface SessionHelpers {
  speak: (text: string) => void
  validateAnswer: (user: string, correct: string) => boolean
  hasChinese: (text: string) => boolean
  formatProgress: (progress: Progress) => string
  humanizeSetLabel: (raw: string) => string
  getMultiSetLabel: () => string
}
