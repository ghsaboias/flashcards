import type { SessionState } from '../types'
import { buildAnswerMap, buildCardMetaMap } from './session-maps'
import { nowUtc } from './session-helpers'

type Env = {
  DB: D1Database
}

export async function handlePlayAgain(
  state: DurableObjectState,
  env: Env
): Promise<Response> {
  const currentState = await state.storage.get<SessionState>('state')
  if (!currentState) {
    return Response.json({ error: 'Session not found' }, { status: 404 })
  }

  // Create a new session ID (this DO will handle the new session)
  const newSessionId = state.id.toString()
  const started_at = new Date().toISOString()

  // Use the same cards from the original session
  const cards = currentState.cards

  // Create a new shuffled order
  const order = cards.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  // Build fast lookup maps for the same cards
  const answerMap = buildAnswerMap(cards)
  const cardMetaMap = buildCardMetaMap(cards)
  const difficultyMap = currentState.difficultyMap || new Map()
  const srsMap = currentState.srsMap || new Map()

  // Create new session state with same mode and practice name
  const newState: SessionState = {
    session_id: newSessionId,
    mode: currentState.mode,
    started_at,
    session_type: currentState.session_type,
    practice_name: currentState.practice_name ? `${currentState.practice_name} (Play Again)` : 'Play Again',
    position: 0,
    order,
    cards,
    answerMap,
    cardMetaMap,
    difficultyMap,
    srsMap,
    correct_count: 0,
    results: [],
  }

  // Store the new session state
  await state.storage.put('state', newState)

  // Write session header to D1
  await env.DB.prepare(
    `INSERT OR REPLACE INTO sessions (id, practice_name, session_type, started_at)
     VALUES (?, ?, ?, ?)`
  ).bind(newSessionId, newState.practice_name ?? null, newState.session_type, nowUtc()).run()

  if (order.length === 0) {
    return Response.json({ session_id: newSessionId, done: true, progress: { current: 0, total: 0 } })
  }

  // Return the first question
  const firstIdx = order[0]
  const firstCard = cards[firstIdx]
  const result = {
    session_id: newSessionId,
    done: false,
    card: { index: firstIdx, question: firstCard?.question || '' },
    progress: { current: 0, total: order.length }
  }

  await state.storage.put('question_start', Date.now())
  return Response.json(result)
}