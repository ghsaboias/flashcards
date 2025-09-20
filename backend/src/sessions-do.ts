import { updateSrs } from './srs'
import type { SessionCard, SessionState } from './types'
import { validateAnswer } from './utils/validateAnswer'
import { fetchCards, fetchMultiSetCards, fetchMultiSetSrsCards, extractSrsData } from './utils/db-queries'

type Env = {
  DB: D1Database
}

export class SessionsDO {
  state: DurableObjectState
  env: Env
  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'POST' && url.pathname.endsWith('/start')) {
      return this.start(request)
    }
    if (request.method === 'POST' && url.pathname.endsWith('/answer')) {
      return this.answer(request)
    }
    if (request.method === 'POST' && url.pathname.endsWith('/cancel')) {
      return this.cancel()
    }
    if (request.method === 'POST' && url.pathname.endsWith('/play-again')) {
      return this.playAgain()
    }
    if (request.method === 'GET') {
      return this.get()
    }
    return new Response('Not found', { status: 404 })
  }

  private async start(request: Request): Promise<Response> {
    const payload = await request.json() as {
      mode: 'multi_set_all' | 'multi_set_difficult' | 'multi_set_srs' | 'review_incorrect'
      difficulty_levels?: Array<'easy' | 'medium' | 'hard'>
      selected_sets: string[]
      review_items?: Array<{ question: string; answer: string; set_name?: string }>
      exclude_new_cards?: boolean
    }
    const session_id = this.state.id.toString()
    const started_at = new Date().toISOString()

    let cards: SessionCard[] = []
    let cardsWithMetadata: Array<SessionCard & { correct_count?: number; incorrect_count?: number; reviewed_count?: number; easiness_factor?: number; interval_hours?: number; repetitions?: number }> = []
    if (payload.mode === 'multi_set_all') {
      // All cards from multiple selected sets
      const result = await fetchMultiSetCards(this.env.DB, { fields: 'full' }, payload.selected_sets)
      cardsWithMetadata = result.metadata
      cards = result.cards
    } else if (payload.mode === 'multi_set_difficult' && payload.difficulty_levels?.length) {
      const TARGET_SESSION_SIZE = 20

      // First: Get available SRS cards (highest priority)
      const srsResult = await fetchMultiSetSrsCards(
        this.env.DB,
        { fields: 'full' },
        payload.selected_sets,
        TARGET_SESSION_SIZE
      )

      let allCards = [...srsResult.metadata]

      // If SRS doesn't fill session, add difficult cards
      if (allCards.length < TARGET_SESSION_SIZE) {
        const remaining = TARGET_SESSION_SIZE - allCards.length
        const diffResult = await fetchMultiSetCards(this.env.DB, { fields: 'full' }, payload.selected_sets)
        let difficultCards = diffResult.metadata
          .filter(r => this.matchesDifficulty(r, new Set(payload.difficulty_levels!)))
          .filter(r => !allCards.some(existing => existing.id === r.id)) // Avoid duplicates

        // Filter out new cards if requested
        if (payload.exclude_new_cards) {
          difficultCards = difficultCards.filter(r =>
            (r.reviewed_count || 0) > 0 || (r.correct_count || 0) > 0 || (r.incorrect_count || 0) > 0
          )
        }

        allCards = [...allCards, ...difficultCards.slice(0, remaining)]
      }

      cardsWithMetadata = allCards
      cards = cardsWithMetadata.map(r => ({ id: r.id, category_key: r.category_key, set_key: r.set_key, question: r.question, answer: r.answer }))
    } else if (payload.mode === 'multi_set_srs') {
      const TARGET_SESSION_SIZE = 20
      const result = await fetchMultiSetSrsCards(this.env.DB, { fields: 'full' }, payload.selected_sets, TARGET_SESSION_SIZE)
      cards = result.cards
      cardsWithMetadata = result.metadata
    } else if (payload.mode === 'review_incorrect' && payload.review_items?.length) {
      const out: any[] = []
      for (const it of payload.review_items) {
        if (!it.question || !it.answer) continue
        if (it.set_name) {
          const result = await fetchCards(this.env.DB, { fields: 'full', where: 'exact_match' }, [it.set_name, it.question, it.answer])
          if (result.metadata[0]) out.push(result.metadata[0])
        } else {
          const result = await fetchCards(this.env.DB, { fields: 'full', where: 'question_answer', limit: 1 }, [it.question, it.answer])
          if (result.metadata[0]) out.push(result.metadata[0])
        }
      }
      cardsWithMetadata = out
      cards = cardsWithMetadata.map(c => ({ id: c.id, category_key: c.category_key, set_key: c.set_key, question: c.question, answer: c.answer }))
    }

    const order = cards.map((_, i) => i)
    // Shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
    }

    // Build fast lookup maps for instant O(1) answer validation
    const answerMap = this.buildAnswerMap(cards)
    const cardMetaMap = this.buildCardMetaMap(cards)
    const difficultyMap = this.buildDifficultyMap(cardsWithMetadata)
    const srsMap = this.buildSRSMap(cardsWithMetadata)

    // Remove broken duplicateIndexMap precomputation (we update duplicates at DB level)
    let duplicateIndexMap: Record<string, number[]> | undefined

    const state: SessionState = {
      session_id,
      mode: payload.mode as any,
      started_at,
      session_type: this.computeSessionType(payload.mode),
      practice_name: payload.mode === 'multi_set_srs' ? 'Selected Sets' :
            payload.mode === 'multi_set_all' || payload.mode === 'multi_set_difficult' ?
              `Multi-Set (${payload.selected_sets?.length || 0} sets)` : undefined,
      position: 0,
      order,
      cards,
      // Fast lookup maps for O(1) performance
      answerMap,
      cardMetaMap,
      difficultyMap,
      srsMap,
      correct_count: 0,
      results: [],
    }
    await this.state.storage.put('state', state)
    // Write session header to D1
    await this.env.DB.prepare(
      `INSERT OR REPLACE INTO sessions (id, practice_name, session_type, started_at)
       VALUES (?, ?, ?, ?)`
    ).bind(session_id, state.practice_name ?? null, state.session_type, this.nowUtc()).run()

    if (order.length === 0) {
      return Response.json({ session_id, done: true, progress: { current: 0, total: 0 } })
    }
    const firstIdx = order[0]
    const q = cards[firstIdx]?.question || ''
    const out = { session_id, done: false, card: { index: firstIdx, question: q }, progress: { current: 0, total: order.length } }
    await this.state.storage.put('question_start', Date.now())
    return Response.json(out)
  }

  private async answer(request: Request): Promise<Response> {
    const body = await request.json() as { answer: string; response_time_ms?: number }
    const state = (await this.state.storage.get<SessionState>('state'))!
    const order = state.order
    const pos = state.position
    if (pos >= order.length) {
      return Response.json({ done: true, progress: { current: order.length, total: order.length }, results: state.results })
    }
    const idx = order[pos]
    const card = state.cards[idx]
    // Use fast Map lookup instead of D1 query (0.1ms vs 500ms)
    const isCorrect = this.validateAnswerFast(state, card.question, body.answer)
    const startTs = (await this.state.storage.get<number>('question_start')) || Date.now()
    const responseTimeMs = body.response_time_ms || (Date.now() - startTs)
    const duration = Math.round(responseTimeMs / 100) / 10

    // Real-time difficulty assessment based on response time and accuracy
    const responseDifficulty = this.assessResponseDifficulty(responseTimeMs, isCorrect)
    
    // Get pre-computed card difficulty for smarter feedback
    const cardDifficulty = this.getDifficultyFast(state, card.question)
    
    // Calculate adaptive feedback duration using both response and card difficulty
    const feedbackDuration = this.calculateAdaptiveFeedbackDuration(responseTimeMs, responseDifficulty, cardDifficulty, isCorrect)

    // Update counts for this specific card only (no more bulk category updates)
    const doAll = false

    // Use D1 batch instead of BEGIN/COMMIT inside DO
    const stmts: D1PreparedStatement[] = []
    if (doAll) {
      stmts.push(
        this.env.DB.prepare(
          `UPDATE cards SET
             correct_count = correct_count + ?,
             incorrect_count = incorrect_count + ?,
             reviewed_count = reviewed_count + 1,
             updated_at = strftime('%Y-%m-%d %H:%M:%S','now')
           WHERE category_key = ? AND question = ? AND answer = ?`
        ).bind(isCorrect ? 1 : 0, isCorrect ? 0 : 1, card.category_key, card.question, card.answer)
      )
    } else {
      stmts.push(
        this.env.DB.prepare(
          `UPDATE cards SET
             correct_count = correct_count + ?,
             incorrect_count = incorrect_count + ?,
             reviewed_count = reviewed_count + 1,
             updated_at = strftime('%Y-%m-%d %H:%M:%S','now')
           WHERE id = ?`
        ).bind(isCorrect ? 1 : 0, isCorrect ? 0 : 1, card.id)
      )
    }
    // SRS only for the exact card in SRS modes
    if (state.mode === 'multi_set_srs') {
      // Use fast Map lookup for current SRS state (0.1ms vs 100-500ms D1 query)
      const currentSRS = this.getSRSDataFast(state, card.question)
      const next = updateSrs(currentSRS, isCorrect)
      stmts.push(
        this.env.DB.prepare(
          `UPDATE cards SET easiness_factor = ?, interval_hours = ?, repetitions = ?, next_review_date = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S','now') WHERE id = ?`
        ).bind(next.easiness_factor, next.interval_hours, next.repetitions, next.next_review_date, card.id)
      )
    }
    // Event insert
    stmts.push(
      this.env.DB.prepare(
        `INSERT OR IGNORE INTO session_events (session_id, position, card_id, category_key, set_key, question, user_answer, correct_answer, correct, duration_seconds, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(state.session_id, pos, card.id, card.category_key, card.set_key, card.question, body.answer, card.answer, isCorrect ? 1 : 0, duration, this.nowUtc())
    )
    await this.env.DB.batch(stmts)

    state.results.push({ question: card.question, correct: isCorrect, correct_answer: card.answer, user_answer: body.answer })
    if (isCorrect) state.correct_count += 1
    state.position += 1
    await this.state.storage.put('state', state)

    if (state.position >= order.length) {
      await this.env.DB.prepare(
        `UPDATE sessions SET ended_at = ?, duration_seconds = ?, correct_count = ?, total = ? WHERE id = ?`
      ).bind(this.nowUtc(), Math.round((Date.now() - new Date(state.started_at).getTime()) / 100) / 10, state.correct_count, order.length, state.session_id).run()
      return Response.json({ done: true, progress: { current: order.length, total: order.length }, results: state.results, result: { correct: state.correct_count, total: order.length } })
    }
    const nextIdx = order[state.position]
    await this.state.storage.put('question_start', Date.now())
    return Response.json({ 
      done: false, 
      card: { index: nextIdx, question: state.cards[nextIdx]?.question || '' }, 
      progress: { current: state.position, total: order.length }, 
      evaluation: { question: card.question, correct: isCorrect, correct_answer: card.answer, difficulty: responseDifficulty }, 
      results: state.results,
      feedback_duration_ms: feedbackDuration
    })
  }

  private async get(): Promise<Response> {
    const state = (await this.state.storage.get<SessionState>('state'))
    if (!state) return new Response('Not found', { status: 404 })
    const done = state.position >= state.order.length
    const current_question = done ? null : state.cards[state.order[state.position]]?.question
    return Response.json({ done, progress: { current: Math.min(state.position, state.order.length), total: state.order.length }, current_question, results: state.results })
  }

  private async cancel(): Promise<Response> {
    const state = await this.state.storage.get<SessionState>('state')

    if (!state) {
      await this.state.storage.delete('question_start')
      return Response.json({ cancelled: false })
    }

    const durationSeconds = Math.round((Date.now() - new Date(state.started_at).getTime()) / 100) / 10
    try {
      await this.env.DB.prepare(
        `UPDATE sessions SET ended_at = ?, duration_seconds = ?, correct_count = ?, total = ? WHERE id = ?`
      ).bind(
        this.nowUtc(),
        durationSeconds,
        state.correct_count,
        state.order.length,
        state.session_id
      ).run()
    } catch (error) {
      console.error('Failed to persist cancelled session state:', error)
    }

    await this.state.storage.delete('state')
    await this.state.storage.delete('question_start')

    return Response.json({
      cancelled: true,
      progress: { current: Math.min(state.position, state.order.length), total: state.order.length },
      results: state.results
    })
  }

  private matchesDifficulty(r: any, requested: Set<'easy' | 'medium' | 'hard'>): boolean {
    const c = Number(r.correct_count || 0)
    const ic = Number(r.incorrect_count || 0)
    const rv = Number(r.reviewed_count || 0)
    const attempts = rv > 0 ? rv : (c + ic)
    let status: 'easy' | 'medium' | 'hard'
    if (attempts <= 10) status = 'hard'
    else {
      const accuracy = (c / attempts) * 100
      if (accuracy > 90) status = 'easy'
      else if (accuracy > 80) status = 'medium'
      else status = 'hard'
    }
    return requested.has(status)
  }

  private nowUtc(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  }

  private computeSessionType(mode: string): string {
    switch (mode) {
      case 'multi_set_all': return 'Multi-Set Review'
      case 'multi_set_difficult': return 'Multi-Set Practice by Difficulty'
      case 'multi_set_srs': return 'SRS Review'
      case 'review_incorrect': return 'Review Incorrect'
      default: return mode
    }
  }

  private assessResponseDifficulty(responseTimeMs: number, isCorrect: boolean): 'easy' | 'medium' | 'hard' {
    // Base difficulty on response time: 2s = easy, 4s = medium, 6s+ = hard
    const durationSec = responseTimeMs / 1000
    let timeDifficulty: 'easy' | 'medium' | 'hard'
    if (durationSec <= 2) timeDifficulty = 'easy'
    else if (durationSec <= 4) timeDifficulty = 'medium'  
    else timeDifficulty = 'hard'

    // If incorrect, bump up difficulty by one level
    if (!isCorrect) {
      if (timeDifficulty === 'easy') timeDifficulty = 'medium'
      else if (timeDifficulty === 'medium') timeDifficulty = 'hard'
      // hard stays hard
    }

    return timeDifficulty
  }

  private calculateFeedbackDuration(responseTimeMs: number, difficulty: 'easy' | 'medium' | 'hard', isCorrect: boolean): number {
    const baseTime = 2000 // 2 seconds base
    const responseContribution = responseTimeMs * 0.3 // 30% of response time
    
    const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
    const difficultyTime = difficultyMultiplier * 1000 // 1s, 2s, or 3s
    
    // Incorrect answers get extra time for consolidation
    const correctnessBonus = isCorrect ? 0 : 1500 // +1.5s for incorrect
    
    const totalTime = Math.max(
      baseTime + responseContribution + correctnessBonus,
      difficultyTime
    )
    
    return Math.min(totalTime, 6000) // Cap at 6 seconds
  }

  private calculateAdaptiveFeedbackDuration(responseTimeMs: number, responseDifficulty: 'easy' | 'medium' | 'hard', cardDifficulty: 'easy' | 'medium' | 'hard', isCorrect: boolean): number {
    const baseTime = 1500 // Base feedback time
    const responseContribution = Math.min(responseTimeMs * 0.25, 2000) // Cap response contribution
    
    // Combine response difficulty with historical card difficulty
    const combinedDifficulty = responseDifficulty === 'hard' || cardDifficulty === 'hard' ? 'hard' :
                              responseDifficulty === 'medium' || cardDifficulty === 'medium' ? 'medium' : 'easy'
    
    const difficultyMultiplier = combinedDifficulty === 'easy' ? 1 : combinedDifficulty === 'medium' ? 1.5 : 2.5
    const difficultyTime = difficultyMultiplier * 1000
    
    // Incorrect answers on hard cards get more time for consolidation
    const correctnessBonus = isCorrect ? 0 : (cardDifficulty === 'hard' ? 2000 : 1500)
    
    const totalTime = Math.max(
      baseTime + responseContribution + correctnessBonus,
      difficultyTime
    )
    
    return Math.min(totalTime, 6000) // Cap at 6 seconds
  }

  // Fast lookup map builders
  private buildAnswerMap(cards: SessionCard[]): Map<string, string> {
    const map = new Map<string, string>()
    for (const card of cards) {
      map.set(card.question, card.answer)
    }
    return map
  }

  private buildCardMetaMap(cards: SessionCard[]): Map<string, { id: number; category_key: string; set_key: string }> {
    const map = new Map<string, { id: number; category_key: string; set_key: string }>()
    for (const card of cards) {
      map.set(card.question, { id: card.id, category_key: card.category_key, set_key: card.set_key })
    }
    return map
  }

  private buildDifficultyMap(cardsWithMetadata: Array<{ question: string; correct_count?: number; incorrect_count?: number; reviewed_count?: number }>): Map<string, 'easy' | 'medium' | 'hard'> {
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

  private buildSRSMap(cardsWithMetadata: Array<{ question: string; easiness_factor?: number; interval_hours?: number; repetitions?: number }>): Map<string, { easiness_factor: number; interval_hours: number; repetitions: number }> {
    const map = new Map<string, { easiness_factor: number; interval_hours: number; repetitions: number }>()
    for (const card of cardsWithMetadata) {
      map.set(card.question, extractSrsData(card))
    }
    return map
  }

  // Fast answer validation using Map lookup instead of D1 query
  private validateAnswerFast(state: SessionState, question: string, userAnswer: string): boolean {
    if (!state.answerMap) {
      // Fallback to card data if maps weren't built (backward compatibility)
      const card = state.cards.find(c => c.question === question)
      return card ? validateAnswer(userAnswer, card.answer) : false
    }
    const correctAnswer = state.answerMap.get(question)
    return correctAnswer ? validateAnswer(userAnswer, correctAnswer) : false
  }

  // Fast difficulty lookup
  private getDifficultyFast(state: SessionState, question: string): 'easy' | 'medium' | 'hard' {
    return state.difficultyMap?.get(question) || 'hard'
  }

  // Fast SRS data lookup
  private getSRSDataFast(state: SessionState, question: string): { easiness_factor: number; interval_hours: number; repetitions: number } {
    return state.srsMap?.get(question) || { easiness_factor: 2.5, interval_hours: 0, repetitions: 0 }
  }

  private async playAgain(): Promise<Response> {
    const currentState = await this.state.storage.get<SessionState>('state')
    if (!currentState) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    // Create a new session ID (this DO will handle the new session)
    const newSessionId = this.state.id.toString()
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
    const answerMap = this.buildAnswerMap(cards)
    const cardMetaMap = this.buildCardMetaMap(cards)
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
    await this.state.storage.put('state', newState)

    // Write session header to D1
    await this.env.DB.prepare(
      `INSERT OR REPLACE INTO sessions (id, practice_name, session_type, started_at)
       VALUES (?, ?, ?, ?)`
    ).bind(newSessionId, newState.practice_name ?? null, newState.session_type, this.nowUtc()).run()

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

    await this.state.storage.put('question_start', Date.now())
    return Response.json(result)
  }
}

