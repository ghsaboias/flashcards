import type { SessionCard, SessionState } from '../types'
import { validateAnswer } from './validateAnswer'
import { extractSrsData } from './db-queries'

// Fast lookup map builders
export function buildAnswerMap(cards: SessionCard[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const card of cards) {
    map.set(card.question, card.answer)
  }
  return map
}

export function buildCardMetaMap(cards: SessionCard[]): Map<string, { id: number; category_key: string; set_key: string }> {
  const map = new Map<string, { id: number; category_key: string; set_key: string }>()
  for (const card of cards) {
    map.set(card.question, { id: card.id, category_key: card.category_key, set_key: card.set_key })
  }
  return map
}

export function buildDifficultyMap(cardsWithMetadata: Array<{ question: string; correct_count?: number; incorrect_count?: number; reviewed_count?: number }>): Map<string, 'easy' | 'medium' | 'hard'> {
  const map = new Map<string, 'easy' | 'medium' | 'hard'>()
  for (const card of cardsWithMetadata) {
    const c = Number(card.correct_count || 0)
    const ic = Number(card.incorrect_count || 0)
    const rv = Number(card.reviewed_count || 0)
    const attempts = rv > 0 ? rv : (c + ic)
    let difficulty: 'easy' | 'medium' | 'hard'
    if (attempts <= 10) difficulty = 'hard'
    else {
      const accuracy = (c / attempts) * 100
      if (accuracy > 90) difficulty = 'easy'
      else if (accuracy > 80) difficulty = 'medium'
      else difficulty = 'hard'
    }
    map.set(card.question, difficulty)
  }
  return map
}

export function buildSRSMap(cardsWithMetadata: Array<{ question: string; easiness_factor?: number; interval_hours?: number; repetitions?: number }>): Map<string, { easiness_factor: number; interval_hours: number; repetitions: number }> {
  const map = new Map<string, { easiness_factor: number; interval_hours: number; repetitions: number }>()
  for (const card of cardsWithMetadata) {
    map.set(card.question, extractSrsData(card))
  }
  return map
}

// Fast answer validation using Map lookup instead of D1 query
export function validateAnswerFast(state: SessionState, question: string, userAnswer: string): boolean {
  if (!state.answerMap) {
    // Fallback to card data if maps weren't built (backward compatibility)
    const card = state.cards.find(c => c.question === question)
    return card ? validateAnswer(userAnswer, card.answer) : false
  }
  const correctAnswer = state.answerMap.get(question)
  return correctAnswer ? validateAnswer(userAnswer, correctAnswer) : false
}

// Fast difficulty lookup
export function getDifficultyFast(state: SessionState, question: string): 'easy' | 'medium' | 'hard' {
  return state.difficultyMap?.get(question) || 'hard'
}

// Fast SRS data lookup
export function getSRSDataFast(state: SessionState, question: string): { easiness_factor: number; interval_hours: number; repetitions: number } {
  return state.srsMap?.get(question) || { easiness_factor: 2.5, interval_hours: 0, repetitions: 0 }
}