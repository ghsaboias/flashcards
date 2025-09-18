// Consolidated component prop types to eliminate interface duplication

import type { SessionState, SessionActions, SessionHelpers } from './session-types'

// Base props that most session-related components need
export interface BaseSessionProps {
  sessionState: SessionState
  actions: SessionActions
}

// Base props for components that need session data + helpers
export interface BaseSessionWithHelpersProps extends BaseSessionProps {
  helpers: SessionHelpers
}

// For practice/question components that need answer capabilities
export interface BaseQuestionProps extends BaseSessionProps {
  canAnswer: boolean
  speak: (text: string) => void
}

// For completion/results components that need summary data
export interface BaseCompletionProps extends BaseSessionProps {
  canStartByDifficulty: boolean
}

// For components that need specific label formatters
export interface BaseLabelProps {
  humanizeSetLabel: (raw: string) => string
  humanizeCategoryLabel: (raw: string) => string
  getMultiSetLabel: () => string
}

// For components that need drawing functionality
export interface BaseDrawingProps {
  exitBrowse: () => void
  nextBrowse: () => void
  prevBrowse: () => void
  setInDrawingMode: (enabled: boolean) => void
  setDrawingProgress: (progress: { current: number; total: number }) => void
  onDrawingComplete: (nextPos: number, total: number) => void
}

// For stats/overview components
export interface BaseStatsProps extends BaseSessionWithHelpersProps, BaseLabelProps, BaseDrawingProps {}

// Combined props for complex components
export interface ComprehensiveProps extends
  BaseSessionProps,
  BaseLabelProps,
  BaseDrawingProps {
  canStartByDifficulty: boolean
  speak: (text: string) => void
}

// Specific component prop interfaces
export type PracticeSessionProps = BaseQuestionProps

export type SessionCompleteProps = BaseCompletionProps & BaseLabelProps

export interface HighIntensityModeProps extends BaseSessionProps {
  humanizeSetLabel: (raw: string) => string
  humanizeCategoryLabel: (raw: string) => string
  getMultiSetLabel: () => string
}

export interface TraditionalModesProps extends BaseSessionProps, BaseLabelProps {
  canStartByDifficulty: boolean
  difficultyCounts: Record<'easy' | 'medium' | 'hard', number>
}

export type StatsOverviewProps = BaseStatsProps

export interface KeyboardHandlerProps extends BaseSessionProps {
  speak: (text: string) => void
}

// For table components that display data
export interface StatsTableProps {
  stats: NonNullable<SessionState['stats']>
  humanizeSetLabel: (raw: string) => string
  humanizeCategoryLabel: (raw: string) => string
  getMultiSetLabel: () => string
}

export interface SrsTableProps {
  srsRows: SessionState['srsRows']
  humanizeSetLabel: (raw: string) => string
  humanizeCategoryLabel: (raw: string) => string
  getMultiSetLabel: () => string
}

// For drawing canvas component
export interface DrawingCanvasProps {
  drawingCards: SessionState['drawingCards']
  drawingPosition: SessionState['drawingPosition']
  drawingProgress: SessionState['drawingProgress']
  setDrawingProgress: SessionActions['setDrawingProgress']
  onDrawingComplete: (nextPos: number, total: number) => void
}

// For audio controls
export interface AudioControlsProps {
  text: string
  enabled: boolean
  speak: (text: string) => void
}