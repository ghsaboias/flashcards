// Consolidated API types to eliminate duplication across the codebase

// Base card interfaces
export interface BaseCard {
  question: string
  pinyin?: string
  answer: string
}

export interface SessionCard extends BaseCard {
  index: number
}

export interface ResultCard extends BaseCard {
  user_answer: string
  correct_answer: string
  correct: boolean
}

export interface ReviewCard extends BaseCard {
  correct_answer: string
}

export interface DrawingCard {
  question: string
  answer: string
}

export interface BrowseCard {
  question: string
  answer: string
}

// Progress tracking
export interface Progress {
  current: number
  total: number
}

// Session evaluation
export interface Evaluation {
  question: string
  correct: boolean
  correct_answer: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

// Session summary
export interface SessionSummary {
  correct: number
  total: number
}

// Retry queue item
export interface RetryQueueItem {
  question: string
  correct_answer: string
}

// Unified session response covering all API endpoints
export interface SessionResponse {
  session_id?: string
  done: boolean
  card?: SessionCard
  progress: Progress
  evaluation?: Evaluation
  result?: SessionSummary
  results?: ResultCard[]
  feedback_duration_ms?: number
  retry_queue?: RetryQueueItem[]
  batch?: Array<{ question: string; pinyin?: string }>
}

// Session configuration for starting sessions
export interface SessionConfig {
  mode?: string
  set_name?: string
  category?: string
  selected_sets?: string[]
  review_items?: Array<{ question: string; answer: string; set_name?: string }>
  user_level?: 'beginner' | 'intermediate' | 'advanced'
  focus_mode?: 'review' | 'challenge'
}

// Answer payload for session responses
export interface AnswerPayload {
  session_id: string
  answer: string
  response_time_ms?: number
}

// Statistics types (already exist in api.ts but included for completeness)
export interface StatRow {
  question: string
  answer: string
  correct: number
  incorrect: number
  total: number
  accuracy: number
}

export interface StatsSummary {
  correct: number
  incorrect: number
  total: number
  accuracy: number
  total_cards: number
  attempted_cards: number
  difficult_count: number
}

export interface StatsPayload {
  summary: StatsSummary
  rows: StatRow[]
}

// SRS types (already exist in api.ts but included for completeness)
export interface SrsRow {
  set_name: string
  question: string
  answer: string
  easiness_factor: number
  interval_hours: number
  repetitions: number
  next_review_date: string
}

// Performance analytics types
export interface DailyPerformance {
  date: string
  sessions: number
  questions: number
  accuracy: number
  duration_minutes?: number
}

export interface PerformancePayload {
  summary: {
    total_sessions: number
    total_questions: number
    overall_accuracy: number
    study_days: number
    avg_questions_per_session: number
  }
  daily: DailyPerformance[]
}