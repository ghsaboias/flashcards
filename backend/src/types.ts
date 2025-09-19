export type StartSessionPayload = {
  mode:
  | 'multi_set_all'
  | 'multi_set_difficult'
  | 'multi_set_srs'
  | 'review_incorrect'
  difficulty_levels?: Array<'easy' | 'medium' | 'hard'>
  selected_sets: string[]
  review_items?: Array<{ question: string; answer: string; set_name?: string }>
}

export type SessionCard = {
  id: number
  category_key: string
  set_key: string
  question: string
  answer: string
}

export type SessionState = {
  session_id: string
  mode:
  | 'multi_set_all'
  | 'multi_set_difficult'
  | 'multi_set_srs'
  | 'review_incorrect'
  started_at: string
  practice_name?: string
  session_type: string
  position: number
  order: number[]
  cards: SessionCard[]
  // Fast lookup maps (computed on session start)
  answerMap?: Map<string, string>  // question -> correct answer
  cardMetaMap?: Map<string, { id: number; category_key: string; set_key: string }>  // question -> card metadata
  difficultyMap?: Map<string, 'easy' | 'medium' | 'hard'>  // question -> current difficulty
  srsMap?: Map<string, { easiness_factor: number; interval_hours: number; repetitions: number }>  // question -> SRS state
  // Timing
  question_start_ts?: number
  correct_count: number
  results: Array<{ question: string; correct: boolean; correct_answer: string; user_answer: string }>
  // Real-time difficulty tracking
  recentResponses?: Array<{ difficulty: 'easy' | 'medium' | 'hard'; correct: boolean; duration: number }>
  adaptiveDifficulty?: 'easy' | 'medium' | 'hard'
}


