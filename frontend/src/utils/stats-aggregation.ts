import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export interface StatsSummary {
  correct: number
  incorrect: number
  total: number
  accuracy: number
  total_cards: number
  attempted_cards: number
  difficult_count: number
}

export interface StatsRow {
  question: string
  answer: string
  correct: number
  incorrect: number
  total: number
  accuracy: number
}

export interface StatsResponse {
  summary: StatsSummary
  rows: StatsRow[]
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

export async function aggregateMultiSetStats(setNames: string[]): Promise<StatsResponse> {
  if (setNames.length === 0) {
    return { summary: createEmptyStatsSummary(), rows: [] }
  }

  try {
    const statsPromises = setNames.map(setName =>
      axios.get(`${API_BASE}/stats/set?set_name=${encodeURIComponent(setName)}`)
    )

    const statsResponses = await Promise.all(statsPromises)
    const allStatsRows: StatsRow[] = []
    const summaries: StatsSummary[] = []

    for (const statsRes of statsResponses) {
      if (statsRes?.data) {
        allStatsRows.push(...statsRes.data.rows)
        summaries.push(statsRes.data.summary)
      }
    }

    const aggregatedSummary = aggregateStatsSummaries(summaries)

    return {
      summary: aggregatedSummary,
      rows: allStatsRows
    }
  } catch {
    return { summary: createEmptyStatsSummary(), rows: [] }
  }
}

export async function aggregateMultiCategoryStats(categories: string[]): Promise<StatsResponse> {
  if (categories.length === 0) {
    return { summary: createEmptyStatsSummary(), rows: [] }
  }

  try {
    const statsPromises = categories.map(category =>
      axios.get(`${API_BASE}/stats/category?category=${encodeURIComponent(category)}`)
    )

    const statsResponses = await Promise.all(statsPromises)
    const allStatsRows: StatsRow[] = []
    const summaries: StatsSummary[] = []

    for (const statsRes of statsResponses) {
      if (statsRes?.data) {
        allStatsRows.push(...statsRes.data.rows)
        summaries.push(statsRes.data.summary)
      }
    }

    const aggregatedSummary = aggregateStatsSummaries(summaries)

    return {
      summary: aggregatedSummary,
      rows: allStatsRows
    }
  } catch {
    return { summary: createEmptyStatsSummary(), rows: [] }
  }
}