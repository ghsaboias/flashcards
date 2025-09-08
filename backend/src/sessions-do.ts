import { updateSrs } from './srs'
import type { SessionCard, SessionState } from './types'
import { validateAnswer } from './utils/validateAnswer'

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
    if (request.method === 'GET') {
      return this.get()
    }
    return new Response('Not found', { status: 404 })
  }

  private async start(request: Request): Promise<Response> {
    const payload = await request.json() as {
      mode: 'set_all' | 'category_all' | 'difficulty_set' | 'difficulty_category' | 'srs_sets' | 'srs_categories' | 'multi_set_all' | 'multi_set_difficulty' | 'review_incorrect'
      set_name?: string
      category?: string
      difficulty_levels?: Array<'easy' | 'medium' | 'hard'>
      selected_sets?: string[]
      selected_categories?: string[]
      review_items?: Array<{ question: string; answer: string; set_name?: string }>
    }
    const session_id = this.state.id.toString()
    const started_at = new Date().toISOString()

    let cards: SessionCard[] = []
    if (payload.mode === 'set_all' && payload.set_name) {
      const { results } = await this.env.DB.prepare(
        'SELECT id, category_key, set_key, question, answer FROM cards WHERE set_key = ?'
      ).bind(payload.set_name).all()
      cards = (results || []) as any
    } else if (payload.mode === 'category_all' && payload.category) {
      const { results } = await this.env.DB.prepare(
        'SELECT id, category_key, set_key, question, answer FROM cards WHERE category_key = ?'
      ).bind(payload.category).all()
      // Deduplicate by (Q, A)
      const map = new Map<string, SessionCard>()
        ; ((results || []) as any[]).forEach((r) => {
          const key = `${r.question}||${r.answer}`
          if (!map.has(key)) map.set(key, r as any)
        })
      cards = Array.from(map.values())
    } else if (payload.mode === 'difficulty_set' && payload.set_name && payload.difficulty_levels?.length) {
      const { results } = await this.env.DB.prepare(
        'SELECT id, category_key, set_key, question, answer, correct_count, incorrect_count, reviewed_count FROM cards WHERE set_key = ?'
      ).bind(payload.set_name).all()
      const rows = (results || []) as any[]
      cards = rows.filter(r => this.matchesDifficulty(r, new Set(payload.difficulty_levels!)))
        .map(r => ({ id: r.id, category_key: r.category_key, set_key: r.set_key, question: r.question, answer: r.answer }))
    } else if (payload.mode === 'difficulty_category' && payload.category && payload.difficulty_levels?.length) {
      const { results } = await this.env.DB.prepare(
        'SELECT id, category_key, set_key, question, answer, correct_count, incorrect_count, reviewed_count FROM cards WHERE category_key = ?'
      ).bind(payload.category).all()
      const rows = (results || []) as any[]
      // Deduplicate by (Q,A) after filtering
      const seen = new Set<string>()
      const out: SessionCard[] = []
      for (const r of rows) {
        if (!this.matchesDifficulty(r, new Set(payload.difficulty_levels!))) continue
        const key = `${r.question}||${r.answer}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ id: r.id, category_key: r.category_key, set_key: r.set_key, question: r.question, answer: r.answer })
      }
      cards = out
    } else if (payload.mode === 'srs_sets' && payload.selected_sets?.length) {
      // Due cards across selected sets
      const placeholders = payload.selected_sets.map(() => '?').join(',')
      const { results } = await this.env.DB.prepare(
        `SELECT id, category_key, set_key, question, answer, easiness_factor, interval_hours, repetitions, next_review_date
         FROM cards WHERE set_key IN (${placeholders}) AND datetime(next_review_date) <= CURRENT_TIMESTAMP`
      ).bind(...payload.selected_sets).all()
      cards = (results || []) as any
    } else if (payload.mode === 'srs_categories' && payload.selected_categories?.length) {
      const placeholders = payload.selected_categories.map(() => '?').join(',')
      const { results } = await this.env.DB.prepare(
        `SELECT id, category_key, set_key, question, answer, easiness_factor, interval_hours, repetitions, next_review_date
         FROM cards WHERE category_key IN (${placeholders}) AND datetime(next_review_date) <= CURRENT_TIMESTAMP`
      ).bind(...payload.selected_categories).all()
      cards = (results || []) as any
    } else if (payload.mode === 'multi_set_all' && payload.selected_sets?.length) {
      // All cards from multiple selected sets
      const placeholders = payload.selected_sets.map(() => '?').join(',')
      const { results } = await this.env.DB.prepare(
        `SELECT id, category_key, set_key, question, answer FROM cards WHERE set_key IN (${placeholders})`
      ).bind(...payload.selected_sets).all()
      cards = (results || []) as any
    } else if (payload.mode === 'multi_set_difficulty' && payload.selected_sets?.length && payload.difficulty_levels?.length) {
      // Difficult cards from multiple selected sets
      const placeholders = payload.selected_sets.map(() => '?').join(',')
      const { results } = await this.env.DB.prepare(
        `SELECT id, category_key, set_key, question, answer, correct_count, incorrect_count, reviewed_count FROM cards WHERE set_key IN (${placeholders})`
      ).bind(...payload.selected_sets).all()
      const rows = (results || []) as any[]
      cards = rows.filter(r => this.matchesDifficulty(r, new Set(payload.difficulty_levels!)))
        .map(r => ({ id: r.id, category_key: r.category_key, set_key: r.set_key, question: r.question, answer: r.answer }))
    } else if (payload.mode === 'review_incorrect' && payload.review_items?.length) {
      const out: SessionCard[] = []
      for (const it of payload.review_items) {
        if (!it.question || !it.answer) continue
        if (it.set_name) {
          const { results } = await this.env.DB.prepare(
            'SELECT id, category_key, set_key, question, answer FROM cards WHERE set_key = ? AND question = ? AND answer = ?'
          ).bind(it.set_name, it.question, it.answer).all()
          if (results && results[0]) out.push(results[0] as any)
        } else {
          const { results } = await this.env.DB.prepare(
            'SELECT id, category_key, set_key, question, answer FROM cards WHERE question = ? AND answer = ? LIMIT 1'
          ).bind(it.question, it.answer).all()
          if (results && results[0]) out.push(results[0] as any)
        }
      }
      cards = out
    }

    const order = cards.map((_, i) => i)
    // Shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
    }

    // Remove broken duplicateIndexMap precomputation (we update duplicates at DB level)
    let duplicateIndexMap: Record<string, number[]> | undefined

    const state: SessionState = {
      session_id,
      mode: payload.mode as any,
      started_at,
      session_type: this.computeSessionType(payload.mode),
      practice_name: payload.set_name || payload.category ||
        (payload.mode === 'srs_sets' ? 'Selected Sets' :
          payload.mode === 'srs_categories' ? 'Selected Categories' :
            payload.mode === 'multi_set_all' || payload.mode === 'multi_set_difficulty' ?
              `Multi-Set (${payload.selected_sets?.length || 0} sets)` : undefined),
      position: 0,
      order,
      cards,
      duplicateIndexMap,
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
    const isCorrect = validateAnswer(body.answer, card.answer)
    const startTs = (await this.state.storage.get<number>('question_start')) || Date.now()
    const responseTimeMs = body.response_time_ms || (Date.now() - startTs)
    const duration = Math.round(responseTimeMs / 100) / 10

    // Real-time difficulty assessment based on response time and accuracy
    const responseDifficulty = this.assessResponseDifficulty(responseTimeMs, isCorrect)
    
    // Calculate adaptive feedback duration
    const feedbackDuration = this.calculateFeedbackDuration(responseTimeMs, responseDifficulty, isCorrect)

    // Update counts (category: update all duplicates with same Q+A; set: only this card)
    const doAll = state.mode === 'category_all' || state.mode === 'difficulty_category'

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
    if (state.mode === 'srs_sets' || state.mode === 'srs_categories') {
      // Load current SRS state (read outside batch)
      const current = await this.env.DB.prepare(
        'SELECT easiness_factor, interval_hours, repetitions FROM cards WHERE id = ?'
      ).bind(card.id).all()
      const row = current.results && (current.results[0] as any)
      const ef = row?.easiness_factor ?? 2.5
      const iv = row?.interval_hours ?? 0
      const rp = row?.repetitions ?? 0
      const next = updateSrs({ easiness_factor: ef, interval_hours: iv, repetitions: rp }, isCorrect)
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
      case 'set_all': return 'Review All'
      case 'category_all': return 'Category Review'
      case 'difficulty_set': return 'Practice by Difficulty'
      case 'difficulty_category': return 'Practice by Difficulty'
      case 'srs_sets': return 'SRS Review'
      case 'srs_categories': return 'SRS Review'
      case 'multi_set_all': return 'Multi-Set Review'
      case 'multi_set_difficulty': return 'Multi-Set Practice by Difficulty'
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
}


