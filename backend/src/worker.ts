import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { SessionsDO as SessionsDOClass } from './sessions-do'
import { fetchCards, mapToSrsRow, buildCardQuery } from './utils/db-queries'
import { computeAccuracyRow, computeStatsSummary, createEmptyStatsSummary } from './utils/stats-utils'

// Bindings
type Env = {
  DB: D1Database
  ASSETS: { fetch: typeof fetch }
  SESSIONS: DurableObjectNamespace
  API_TOKEN?: string
}

const app = new Hono<{ Bindings: Env }>()

// Auth middleware (Bearer token)
app.use('/api/*', async (c, next) => {
  const auth = c.req.header('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7)
    : ''
  const configured = c.env.API_TOKEN || ''
  if (!configured || token === configured) {
    return next()
  }
  throw new HTTPException(401, { message: 'Unauthorized' })
})

// Health
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Domains
app.get('/api/domains', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM domains ORDER BY name').all()
  return c.json(results || [])
})

// Sets
app.get('/api/sets', async (c) => {
  const domainId = c.req.query('domain_id') || ''

  let sql = 'SELECT DISTINCT set_key FROM cards'
  const params = []

  if (domainId) {
    sql += ' WHERE domain_id = ?'
    params.push(domainId)
  }

  sql += ' ORDER BY set_key'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json((results || []).map((r: any) => r.set_key))
})

// Categories
app.get('/api/categories', async (c) => {
  const domainId = c.req.query('domain_id') || ''

  let sql = 'SELECT DISTINCT category_key FROM cards'
  const params = []

  if (domainId) {
    sql += ' WHERE domain_id = ?'
    params.push(domainId)
  }

  sql += ' ORDER BY category_key'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json((results || []).map((r: any) => r.category_key))
})

// Browse cards by set
app.get('/api/browse/:set', async (c) => {
  const setName = c.req.param('set')
  const domainId = c.req.query('domain_id') || ''

  if (!setName) return c.json([], 200)

  let sql = 'SELECT question, answer FROM cards WHERE set_key = ?'
  const params = [setName]

  if (domainId) {
    sql += ' AND domain_id = ?'
    params.push(domainId)
  }

  sql += ' ORDER BY question'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json((results || []).map((r: any) => ({
    question: r.question,
    answer: r.answer
  })))
})

// Drawing cards by set (Chinese characters only)
app.get('/api/drawing/:set', async (c) => {
  const setName = c.req.param('set')
  const domainId = c.req.query('domain_id') || ''

  if (!setName) return c.json([], 200)

  let sql = 'SELECT question, answer FROM cards WHERE set_key = ? AND question REGEXP ?'
  const params = [setName, '[\u4e00-\u9fff]']

  if (domainId) {
    sql += ' AND domain_id = ?'
    params.push(domainId)
  }

  sql += ' ORDER BY question'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json((results || []).map((r: any) => ({
    question: r.question,
    answer: r.answer
  })))
})


// SRS: by set
app.get('/api/srs/set', async (c) => {
  const setName = c.req.query('set_name') || ''
  const domainId = c.req.query('domain_id') || ''
  if (!setName) return c.json([], 200)

  let sql = 'SELECT question, answer, easiness_factor, interval_hours, repetitions, next_review_date FROM cards WHERE set_key = ?'
  const params = [setName]

  if (domainId) {
    sql += ' AND domain_id = ?'
    params.push(domainId)
  }

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const rows = (results || []).map((r: any) => mapToSrsRow(r, setName))
  return c.json(rows)
})


// SRS: by domain (optional set filters)
app.get('/api/srs/domain', async (c) => {
  const domainId = c.req.query('domain_id') || ''
  const setFilters = c.req.queries('set_name') || []
  const filteredSets = setFilters.filter(Boolean)

  let sql = 'SELECT set_key, question, answer, easiness_factor, interval_hours, repetitions, next_review_date FROM cards'
  const clauses: string[] = []
  const params: string[] = []

  if (domainId) {
    clauses.push('domain_id = ?')
    params.push(domainId)
  }

  if (filteredSets.length > 0) {
    const placeholders = filteredSets.map(() => '?').join(',')
    clauses.push(`set_key IN (${placeholders})`)
    params.push(...filteredSets)
  }

  if (clauses.length > 0) {
    sql += ` WHERE ${clauses.join(' AND ')}`
  }

  sql += ' ORDER BY set_key, question'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const rows = (results || []).map((r: any) => mapToSrsRow(r, r.set_key))

  return c.json({
    domain_id: domainId || null,
    applied_sets: filteredSets,
    rows,
  })
})



// Stats: by set
app.get('/api/stats/set', async (c) => {
  const setName = c.req.query('set_name') || ''
  const domainId = c.req.query('domain_id') || ''
  if (!setName) return c.json({ set_name: '', summary: createEmptyStatsSummary(), rows: [] })

  let sql = 'SELECT question, answer, correct_count AS correct, incorrect_count AS incorrect, reviewed_count AS reviewed FROM cards WHERE set_key = ?'
  const params = [setName]

  if (domainId) {
    sql += ' AND domain_id = ?'
    params.push(domainId)
  }

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const rows = (results || []).map((r: any) => ({
    question: r.question,
    answer: r.answer,
    ...computeAccuracyRow(r),
  }))
  const summary = computeStatsSummary(rows)
  return c.json({
    set_name: setName,
    summary,
    rows,
  })
})


// Stats: by domain (optional set filters)
app.get('/api/stats/domain', async (c) => {
  const domainId = c.req.query('domain_id') || ''
  const setFilters = c.req.queries('set_name') || []
  const filteredSets = setFilters.filter(Boolean)

  let sql = 'SELECT set_key, question, answer, correct_count AS correct, incorrect_count AS incorrect, reviewed_count AS reviewed FROM cards'
  const clauses: string[] = []
  const params: string[] = []

  if (domainId) {
    clauses.push('domain_id = ?')
    params.push(domainId)
  }

  if (filteredSets.length > 0) {
    const placeholders = filteredSets.map(() => '?').join(',')
    clauses.push(`set_key IN (${placeholders})`)
    params.push(...filteredSets)
  }

  if (clauses.length > 0) {
    sql += ` WHERE ${clauses.join(' AND ')}`
  }

  sql += ' ORDER BY set_key, question'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const rows = (results || []).map((r: any) => ({
    set_name: r.set_key,
    question: r.question,
    answer: r.answer,
    ...computeAccuracyRow(r),
  }))
  const summary = computeStatsSummary(rows)

  return c.json({
    domain_id: domainId || null,
    applied_sets: filteredSets,
    summary,
    rows,
  })
})


// Performance analytics (global or domain-specific)
app.get('/api/performance', async (c) => {
  const domainId = c.req.query('domain_id') || ''

  if (domainId) {
    const { results } = await c.env.DB.prepare(
      `WITH domain_sessions AS (
         SELECT
           s.id AS session_id,
           DATE(s.started_at) AS date,
           SUM(CASE WHEN c.domain_id = ? THEN 1 ELSE 0 END) AS questions,
           SUM(CASE WHEN c.domain_id = ? AND se.correct = 1 THEN 1 ELSE 0 END) AS correct,
           SUM(CASE WHEN c.domain_id = ? THEN COALESCE(se.duration_seconds, 0) ELSE 0 END) AS duration_seconds
         FROM sessions s
         LEFT JOIN session_events se ON se.session_id = s.id
         LEFT JOIN cards c ON c.id = se.card_id
         GROUP BY s.id, DATE(s.started_at)
         HAVING questions > 0
       )
       SELECT session_id, date, questions, correct, duration_seconds
       FROM domain_sessions`
    ).bind(domainId, domainId, domainId).all()

    const domainRows = (results || []).map((r: any) => ({
      sessionId: r.session_id,
      date: r.date,
      questions: Number(r.questions) || 0,
      correct: Number(r.correct) || 0,
      durationSeconds: Number(r.duration_seconds) || 0,
    }))

    const dailyMap = new Map<string, { sessions: number; questions: number; correct: number; durationSeconds: number }>()

    for (const row of domainRows) {
      if (!dailyMap.has(row.date)) {
        dailyMap.set(row.date, { sessions: 0, questions: 0, correct: 0, durationSeconds: 0 })
      }
      const day = dailyMap.get(row.date)!
      day.sessions += 1
      day.questions += row.questions
      day.correct += row.correct
      day.durationSeconds += row.durationSeconds
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        sessions: data.sessions,
        questions: data.questions,
        accuracy: data.questions > 0 ? Math.round(((data.correct / data.questions) * 100) * 10) / 10 : 0,
        duration_minutes: data.durationSeconds > 0 ? Math.round(((data.durationSeconds / 60) * 10)) / 10 : undefined,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const totalSessions = domainRows.length
    const totalQuestions = domainRows.reduce((sum, row) => sum + row.questions, 0)
    const totalCorrect = domainRows.reduce((sum, row) => sum + row.correct, 0)
    const avgQuestionsPerSession = totalSessions > 0 ? Math.round(((totalQuestions / totalSessions) * 10)) / 10 : 0
    const overallAccuracy = totalQuestions > 0 ? Math.round(((totalCorrect / totalQuestions) * 100) * 10) / 10 : 0
    const studyDays = daily.length

    return c.json({
      summary: {
        total_sessions: totalSessions,
        total_questions: totalQuestions,
        overall_accuracy: overallAccuracy,
        study_days: studyDays,
        avg_questions_per_session: avgQuestionsPerSession,
      },
      daily,
    })
  }

  const { results: sessionResults } = await c.env.DB.prepare(
    `SELECT DATE(started_at) AS date,
            COUNT(*) AS sessions,
            SUM(CASE WHEN total IS NOT NULL THEN total ELSE 0 END) AS questions,
            AVG(CASE WHEN total > 0 THEN CAST(correct_count AS REAL) / total * 100 ELSE 0 END) AS accuracy,
            AVG(duration_seconds) / 60 AS duration_minutes
     FROM sessions
     GROUP BY DATE(started_at)
     ORDER BY date DESC`
  ).all()

  const dailyData = (sessionResults || []).map((r: any) => ({
    date: r.date,
    sessions: r.sessions || 0,
    questions: r.questions || 0,
    accuracy: Math.round((r.accuracy || 0) * 10) / 10,
    duration_minutes: r.duration_minutes ? Math.round(r.duration_minutes * 10) / 10 : undefined,
  }))

  const totalSessions = dailyData.reduce((a, b) => a + b.sessions, 0)
  const totalQuestions = dailyData.reduce((a, b) => a + b.questions, 0)
  const studyDays = dailyData.filter(d => d.sessions > 0).length
  const avgQuestionsPerSession = totalSessions > 0 ? Math.round((totalQuestions / totalSessions) * 10) / 10 : 0
  const totalQuestionsWithAccuracy = dailyData.reduce((sum, d) => sum + (d.questions > 0 ? d.questions : 0), 0)
  const overallAccuracy = totalQuestionsWithAccuracy > 0 ?
    Math.round((dailyData.reduce((sum, d) => sum + d.accuracy * d.questions, 0) / totalQuestionsWithAccuracy) * 10) / 10 : 0

  return c.json({
    summary: {
      total_sessions: totalSessions,
      total_questions: totalQuestions,
      overall_accuracy: overallAccuracy,
      study_days: studyDays,
      avg_questions_per_session: avgQuestionsPerSession,
    },
    daily: dailyData.reverse(),
  })
})

// Progressive unlock criteria
const UNLOCK_CRITERIA = {
  'Recognition_Practice/HSK_Level_1/HSK1_Set_02': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_01', minAccuracy: 85, minAttempts: 20 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_03': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_02', minAccuracy: 80, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_04': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_03', minAccuracy: 80, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_05': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_04', minAccuracy: 75, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_06': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_05', minAccuracy: 75, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_07': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_06', minAccuracy: 75, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_08': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_07', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_09': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_08', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_10': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_09', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_11': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_10', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_12': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_11', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_13': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_12', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_14': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_13', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_15': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_14', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_16': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_15', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_17': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_16', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_18': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_17', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_19': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_18', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_20': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_19', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_21': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_20', minAccuracy: 70, minAttempts: 15 }
}

async function checkUnlockStatus(db: D1Database, setName: string): Promise<boolean> {
  const criteria = UNLOCK_CRITERIA[setName as keyof typeof UNLOCK_CRITERIA]
  if (!criteria) return true // No restrictions
  
  const { results } = await db.prepare(
    `SELECT 
      SUM(correct_count) as total_correct,
      SUM(incorrect_count) as total_incorrect,
      SUM(CASE WHEN reviewed_count > 0 THEN reviewed_count ELSE correct_count + incorrect_count END) as total_attempts
     FROM cards WHERE set_key = ?`
  ).bind(criteria.requires).all()
  
  if (!results || results.length === 0) return false
  
  const row = results[0] as any
  const totalAttempts = row.total_attempts || 0
  const totalCorrect = row.total_correct || 0
  
  if (totalAttempts < criteria.minAttempts) return false
  
  const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0
  return accuracy >= criteria.minAccuracy
}

async function getUnlockedSets(db: D1Database, domainId?: string): Promise<string[]> {
  const query = domainId
    ? 'SELECT DISTINCT set_key FROM cards WHERE domain_id = ? ORDER BY set_key'
    : 'SELECT DISTINCT set_key FROM cards ORDER BY set_key'

  const { results: allSets } = domainId
    ? await db.prepare(query).bind(domainId).all()
    : await db.prepare(query).all()
  if (!allSets) return []
  
  const unlockedSets: string[] = []
  for (const row of allSets as any[]) {
    const setName = row.set_key
    const isUnlocked = await checkUnlockStatus(db, setName)
    if (isUnlocked) {
      unlockedSets.push(setName)
    }
  }
  
  return unlockedSets
}

// Smart set selection based on learning state
async function selectOptimalSets(db: D1Database, unlockedSets: string[], domainId: string): Promise<string[]> {
  if (unlockedSets.length === 0) return []

  // Get learning state for all unlocked sets
  const placeholders = unlockedSets.map(() => '?').join(',')
  const { results } = await db.prepare(
    `SELECT
      set_key,
      COUNT(*) as total_cards,
      SUM(correct_count) as total_correct,
      SUM(incorrect_count) as total_incorrect,
      SUM(CASE WHEN reviewed_count > 0 THEN reviewed_count ELSE correct_count + incorrect_count END) as total_attempts,
      SUM(CASE WHEN datetime(next_review_date) <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as due_cards
     FROM cards
     WHERE set_key IN (${placeholders}) AND domain_id = ?
     GROUP BY set_key
     ORDER BY set_key`
  ).bind(...unlockedSets, domainId).all()

  // Score each set based on learning priority
  const setScores = (results || []).map((row: any) => {
    const setName = row.set_key
    const attempts = row.total_attempts || 0
    const correct = row.total_correct || 0
    const dueCards = row.due_cards || 0

    const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0

    let score = 0

    // Priority 1: Sets with SRS due cards (memory maintenance)
    if (dueCards > 0) score += 100

    // Priority 2: Struggling sets (accuracy < 80% with attempts > 10)
    if (attempts > 10 && accuracy < 80) score += 80

    // Priority 3: Active learning sets (moderate attempts, room for improvement)
    if (attempts >= 10 && attempts <= 100 && accuracy >= 80 && accuracy < 90) score += 60

    // Priority 4: New sets (few attempts)
    if (attempts > 0 && attempts <= 10) score += 40

    // Deprioritize mastered sets (accuracy > 90% with many attempts)
    if (attempts > 100 && accuracy > 90) score -= 50

    return { setName, score, accuracy, attempts, dueCards }
  })

  // Sort by score (highest first) and select top 2 sets
  const sortedSets = setScores
    .filter(s => s.score > 0) // Only include sets with positive scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 2) // Limit to 2 sets to avoid context switching
    .map(s => s.setName)

  // Fallback: if no sets scored positively, take first unlocked set
  return sortedSets.length > 0 ? sortedSets : [unlockedSets[0]]
}

// Helper function to analyze cards and detect new vs practiced
async function analyzeSessionCards(db: D1Database, selectedSets: string[], domainId: string, difficultyLevels: string[]) {
  const placeholders = selectedSets.map(() => '?').join(',')

  // Get all relevant cards with their practice status
  const { results } = await db.prepare(
    `SELECT
      question, answer, set_key,
      correct_count, incorrect_count, reviewed_count,
      CASE WHEN reviewed_count = 0 AND correct_count = 0 AND incorrect_count = 0
           THEN 1 ELSE 0 END as is_new
     FROM cards
     WHERE set_key IN (${placeholders}) AND domain_id = ?
     ORDER BY set_key, question`
  ).bind(...selectedSets, domainId).all()

  const allCards = results || []
  const newCards = allCards.filter((card: any) => card.is_new === 1)
  const practicedCards = allCards.filter((card: any) => card.is_new === 0)

  return {
    totalCards: allCards.length,
    newCards: newCards.length,
    practicedCards: practicedCards.length,
    selectedSets,
    newCardExamples: newCards.slice(0, 3).map((card: any) => ({
      question: card.question,
      answer: card.answer,
      set: card.set_key
    }))
  }
}

// Intelligent auto-start session - with optional domain filtering
app.post('/api/sessions/auto-start', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const domainId = body.domain_id || 'chinese' // Default to chinese for backward compatibility
  const skipNewCardCheck = body.skip_new_card_check || false // Allow bypassing the check

  // Get unlocked sets first (filtered by domain)
  const unlockedSets = await getUnlockedSets(c.env.DB, domainId)

  // Priority 1: SRS due cards (spaced repetition takes precedence)
  const placeholders = unlockedSets.map(() => '?').join(',')
  const { results: dueCards } = await c.env.DB.prepare(
    `SELECT DISTINCT set_key FROM cards WHERE set_key IN (${placeholders}) AND domain_id = ? AND datetime(next_review_date) <= CURRENT_TIMESTAMP LIMIT 5`
  ).bind(...unlockedSets, domainId).all()

  if (dueCards && dueCards.length > 0) {
    // SRS review mode - mix of difficulties based on what's due
    const sessionPayload = {
      mode: 'multi_set_srs',
      selected_sets: (dueCards as any[]).map(r => r.set_key)
    }

    const id = c.env.SESSIONS.idFromName(crypto.randomUUID())
    const stub = c.env.SESSIONS.get(id)
    const res = await stub.fetch(new Request(new URL(`https://do/sessions/${id.toString()}/start`), {
      method: 'POST',
      body: JSON.stringify(sessionPayload),
      headers: { 'content-type': 'application/json' }
    }))
    return c.newResponse(res.body, res)
  }

  // Priority 2: Smart set selection based on learning state
  const selected_sets = await selectOptimalSets(c.env.DB, unlockedSets, domainId)
  const difficulty_levels = ['hard', 'medium'] as Array<'easy' | 'medium' | 'hard'>

  // Check for new cards before starting session
  if (!skipNewCardCheck) {
    const analysis = await analyzeSessionCards(c.env.DB, selected_sets, domainId, difficulty_levels)

    if (analysis.newCards > 0) {
      // Return preview instead of starting session
      return c.json({
        type: 'new_cards_detected',
        analysis: {
          ...analysis,
          message: `This session includes ${analysis.newCards} new card${analysis.newCards > 1 ? 's' : ''} you haven't practiced yet.`
        },
        options: {
          continue_with_new: {
            description: 'Start session with new cards included',
            payload: { ...body, skip_new_card_check: true }
          },
          practice_only: {
            description: 'Practice only cards you\'ve seen before',
            payload: {
              mode: 'multi_set_difficulty',
              selected_sets,
              difficulty_levels,
              exclude_new_cards: true
            }
          },
          browse_first: {
            description: 'Browse new cards first, then practice',
            sets_to_browse: selected_sets
          }
        }
      })
    }
  }

  // If no new cards or user chose to continue, start the session
  const sessionPayload = {
    mode: 'multi_set_difficulty',
    selected_sets,
    difficulty_levels,
    exclude_new_cards: body.exclude_new_cards || false
  }

  const id = c.env.SESSIONS.idFromName(crypto.randomUUID())
  const stub = c.env.SESSIONS.get(id)
  const res = await stub.fetch(new Request(new URL(`https://do/sessions/${id.toString()}/start`), {
    method: 'POST',
    body: JSON.stringify(sessionPayload),
    headers: { 'content-type': 'application/json' }
  }))
  return c.newResponse(res.body, res)
})

// Sessions: route to DO instance
app.post('/api/sessions/start', async (c) => {
  const id = c.env.SESSIONS.idFromName(crypto.randomUUID())
  const stub = c.env.SESSIONS.get(id)
  const res = await stub.fetch(new Request(new URL(`https://do/sessions/${id.toString()}/start`), { method: 'POST', body: await c.req.raw.clone().text(), headers: { 'content-type': 'application/json' } }))
  return c.newResponse(res.body, res)
})
app.post('/api/sessions/:id/answer', async (c) => {
  const idParam = c.req.param('id')
  const id = c.env.SESSIONS.idFromString(idParam)
  const stub = c.env.SESSIONS.get(id)
  const res = await stub.fetch(new Request(new URL(`https://do/sessions/${idParam}/answer`), { method: 'POST', body: await c.req.raw.clone().text(), headers: { 'content-type': 'application/json' } }))
  return c.newResponse(res.body, res)
})
app.post('/api/sessions/:id/cancel', async (c) => {
  const idParam = c.req.param('id')
  const id = c.env.SESSIONS.idFromString(idParam)
  const stub = c.env.SESSIONS.get(id)
  const res = await stub.fetch(new Request(new URL(`https://do/sessions/${idParam}/cancel`), { method: 'POST' }))
  return c.newResponse(res.body, res)
})
app.get('/api/sessions/:id', async (c) => {
  const idParam = c.req.param('id')
  const id = c.env.SESSIONS.idFromString(idParam)
  const stub = c.env.SESSIONS.get(id)
  const res = await stub.fetch(new Request(new URL(`https://do/sessions/${idParam}`)))
  return c.newResponse(res.body, res)
})

// Asset serving and SPA fallback
app.all('*', async (c) => {
  const url = new URL(c.req.url)

  // Try to serve the actual file first
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw)

  // If file exists, serve it
  if (assetResponse.status !== 404) {
    return assetResponse
  }

  // For non-existent routes (except API routes), serve index.html for SPA routing
  if (!url.pathname.startsWith('/api/')) {
    const indexRequest = new Request(new URL('/', url.origin))
    return c.env.ASSETS.fetch(indexRequest)
  }

  // Return the original 404 for API routes
  return assetResponse
})

export default app

// Durable Objects placeholders (implement in separate files if desired)
export class SessionsDO {
  state: DurableObjectState
  env: Env
  constructor(state: DurableObjectState, env: Env) {
    // Delegate to actual implementation class
    const impl = new SessionsDOClass(state as any, env as any)
    // @ts-ignore - attach impl for fetch delegation
    this.fetch = impl.fetch.bind(impl)
    this.state = state
    this.env = env
  }
}

// Removed unused RateLimitDO
