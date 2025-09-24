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

// Connection data for network visualization
export interface ConnectionData {
  source: string
  target: string
  type: 'semantic' | 'compound' | 'radical'
  strength: number
}

export interface ConnectionSession {
  phase: string
  cluster_id: string
  connections: ConnectionData[]
}

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
  connection_session?: ConnectionSession
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
  // Connection-aware learning state
  availableClusters: Cluster[]
}

export interface Cluster {
  id: string
  name: string
  description?: string
  anchors: string[]
  size: number
  unlocked: boolean
  completion: number
  recommended: boolean
  difficulty_estimate?: number
  current_phase?: string
  anchors_mastered?: number
}

export type LearningMode = 'random' | 'connected'
export type ConnectionPhase = 'discovery' | 'anchor' | 'expansion' | 'integration' | 'mastery'

// Consolidated session state
export interface SessionState extends
  CoreSessionData,
  HighIntensitySettings,
  UIPreferences,
  DataSettings,
  ViewStates {
  learningMode: LearningMode
  selectedCluster: string | null
}

// Session action categories
export interface CoreSessionActions {
  resetSessionUI: () => void
  clearNewCardsDetection: () => void
  beginAutoSession: (domainId?: string, skipNewCardCheck?: boolean, excludeNewCards?: boolean, connectionAware?: boolean) => Promise<SessionResponse | NewCardsDetectionResponse | undefined>
  beginConnectionAwareSession: (clusterId?: string, phase?: string) => Promise<SessionResponse | undefined>
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
  playAgain: (sessionId: string) => Promise<SessionResponse | undefined>
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
  // Connection-aware learning setters
  setLearningMode: (mode: LearningMode) => void
  setSelectedCluster: (clusterId: string | null) => void
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
