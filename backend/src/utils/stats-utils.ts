export interface StatsRow {
  question: string
  answer: string
  correct: number
  incorrect: number
  total: number
  accuracy: number
  set_name?: string
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

export function computeAccuracyRow(r: any): { correct: number; incorrect: number; total: number; accuracy: number } {
  const correct = Number(r.correct) || 0
  const incorrect = Number(r.incorrect) || 0
  const reviewed = Number(r.reviewed) || 0
  const attempts = reviewed > 0 ? reviewed : correct + incorrect
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 1000) / 10 : 0
  return { correct, incorrect, total: attempts, accuracy }
}

export function computeStatsSummary(rows: StatsRow[]): StatsSummary {
  const total_correct = rows.reduce((a, b) => a + b.correct, 0)
  const total_incorrect = rows.reduce((a, b) => a + b.incorrect, 0)
  const total_attempts = total_correct + total_incorrect
  const accuracy = total_attempts > 0 ? Math.round((total_correct / total_attempts) * 1000) / 10 : 0
  const attempted_cards = rows.filter(r => (r.correct + r.incorrect) > 0).length
  const difficult_count = rows.filter(r => (r.correct + r.incorrect) > 0 && r.accuracy < 80).length

  return {
    correct: total_correct,
    incorrect: total_incorrect,
    total: total_attempts,
    accuracy,
    total_cards: rows.length,
    attempted_cards,
    difficult_count
  }
}

export function createEmptyStatsSummary(): StatsSummary {
  return {
    correct: 0,
    incorrect: 0,
    total: 0,
    accuracy: 0,
    total_cards: 0,
    attempted_cards: 0,
    difficult_count: 0
  }
}

export function aggregateStatsSummaries(summaries: StatsSummary[]): StatsSummary {
  if (summaries.length === 0) return createEmptyStatsSummary()

  const total_correct = summaries.reduce((a, b) => a + b.correct, 0)
  const total_incorrect = summaries.reduce((a, b) => a + b.incorrect, 0)
  const total_attempts = total_correct + total_incorrect
  const accuracy = total_attempts > 0 ? Math.round((total_correct / total_attempts) * 1000) / 10 : 0

  return {
    correct: total_correct,
    incorrect: total_incorrect,
    total: total_attempts,
    accuracy,
    total_cards: summaries.reduce((a, b) => a + b.total_cards, 0),
    attempted_cards: summaries.reduce((a, b) => a + b.attempted_cards, 0),
    difficult_count: summaries.reduce((a, b) => a + b.difficult_count, 0)
  }
}
