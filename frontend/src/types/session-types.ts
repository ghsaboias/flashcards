// Consolidated session state types to eliminate massive interface duplication

import type {
  Progress,
  ResultCard,
  ReviewCard,
  DrawingCard,
  BrowseCard,
  SrsRow,
  StatsPayload,
  PerformancePayload,
  StatRow
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
}

// High-intensity mode settings
export interface HighIntensitySettings {
  isHighIntensityMode: boolean
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  focusMode: 'review' | 'challenge'
  adaptiveFeedbackDuration: number
  questionStartTime: number
}

// Special practice modes
export interface SpecialModes {
  // Browse mode
  inBrowseMode: boolean
  browseRows: BrowseCard[]
  browseIndex: number
  browsePinyin: string

  // Review mode
  inReviewMode: boolean
  reviewCards: ReviewCard[]
  reviewPosition: number

  // Drawing mode
  inDrawingMode: boolean
  drawingCards: DrawingCard[]
  drawingPosition: number
  drawingProgress: Progress


  // Focus mode
  oldFocusMode: boolean
}

// Data selection and settings
export interface DataSettings {
  sets: string[]
  categories: string[]
  selectedSet: string
  selectedCategory: string
  selectedSets: string[]
  mode: 'set' | 'category' | 'multi-set'

  // Difficulty filters
  diffEasy: boolean
  diffMedium: boolean
  diffHard: boolean
}

// View states for stats and performance
export interface ViewStates {
  showSrs: boolean
  srsRows: SrsRow[]
  showStats: boolean
  stats: StatsPayload | null
  showPerformance: boolean
  performance: PerformancePayload | null
  difficultyRows: StatRow[] | null
}

// Consolidated session state
export interface SessionState extends
  CoreSessionData,
  HighIntensitySettings,
  SpecialModes,
  DataSettings,
  ViewStates {}

// Session action categories
export interface CoreSessionActions {
  resetSessionUI: () => void
  beginAutoSession: () => Promise<void>
  beginSetSession: () => Promise<void>
  beginCategorySession: () => Promise<void>
  beginMultiSetSession: () => Promise<void>
  submitAnswer: () => Promise<void>
}

export interface DifficultyActions {
  beginDifficultSet: () => Promise<void>
  beginDifficultCategory: () => Promise<void>
  beginMultiSetDifficult: () => Promise<void>
}

export interface SrsActions {
  beginSrsSets: () => Promise<void>
  beginSrsCategories: () => Promise<void>
  beginMultiSetSrs: () => Promise<void>
}

export interface SpecialModeActions {
  // Browse mode
  beginBrowse: () => Promise<void>
  exitBrowse: () => void
  nextBrowse: () => void
  prevBrowse: () => void

  // Review mode
  beginReviewIncorrect: () => Promise<void>

  // Other modes
  beginDrawingMode: () => Promise<void>
}

export interface ViewActions {
  viewSrs: () => Promise<void>
  viewStats: () => Promise<void>
  viewPerformance: () => Promise<void>
}

export interface SetterActions {
  setInput: (input: string) => void
  setSelectedSet: (set: string) => void
  setSelectedCategory: (category: string) => void
  setSelectedSets: (sets: string[]) => void
  setMode: (mode: 'set' | 'category' | 'multi-set') => void
  setUserLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void
  setFocusMode: (mode: 'review' | 'challenge') => void
  setIsHighIntensityMode: (enabled: boolean) => void
  setOldFocusMode: (enabled: boolean) => void
  setDiffEasy: (enabled: boolean) => void
  setDiffMedium: (enabled: boolean) => void
  setDiffHard: (enabled: boolean) => void
  setDrawingPosition: (position: number) => void
  setDrawingProgress: (progress: Progress) => void
  setInDrawingMode: (enabled: boolean) => void
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
  humanizeCategoryLabel: (raw: string) => string
  getMultiSetLabel: () => string
}