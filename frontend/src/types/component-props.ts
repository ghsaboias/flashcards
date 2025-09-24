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
  getMultiSetLabel: () => string
}

// For components that need drawing functionality (simplified after page migration)
export interface BaseDrawingProps {
  // Drawing functionality now handled by dedicated DrawingPage
  placeholder?: never // Prevent empty interface
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


export interface TraditionalModesProps extends BaseSessionProps, BaseLabelProps {
  canStartByDifficulty: boolean
  difficultyCounts: Record<'easy' | 'medium' | 'hard', number>
  onBackToSimple: () => void
  backLabel?: string
}

export type StatsOverviewProps = BaseStatsProps

export interface KeyboardHandlerProps extends BaseSessionProps {
  speak: (text: string) => void
}

// For table components that display data - using UnifiedTable

// For drawing canvas component (simplified after page migration)
export interface DrawingCanvasProps {
  character: string
  onComplete?: () => void
  onProgressUpdate?: (progress: number) => void
}

// For audio controls
export interface AudioControlsProps {
  text: string
  enabled: boolean
  speak: (text: string) => void
}
