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

// SRS: by category
app.get('/api/srs/category', async (c) => {
  const category = c.req.query('category') || ''
  const domainId = c.req.query('domain_id') || ''
  if (!category) return c.json([], 200)

  let sql = 'SELECT set_key, question, answer, easiness_factor, interval_hours, repetitions, next_review_date FROM cards WHERE category_key = ?'
  const params = [category]

  if (domainId) {
    sql += ' AND domain_id = ?'
    params.push(domainId)
  }

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const rows = (results || []).map((r: any) => mapToSrsRow(r))
  return c.json(rows)
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

// Stats: by category (merge by question+answer)
app.get('/api/stats/category', async (c) => {
  const category = c.req.query('category') || ''
  const domainId = c.req.query('domain_id') || ''
  if (!category) return c.json({ category: '', summary: createEmptyStatsSummary(), rows: [] })

  let sql = `SELECT question, answer,
            SUM(correct_count)   AS correct,
            SUM(incorrect_count) AS incorrect,
            SUM(CASE WHEN reviewed_count > 0 THEN reviewed_count ELSE correct_count + incorrect_count END) AS reviewed
     FROM cards WHERE category_key = ?`
  const params = [category]

  if (domainId) {
    sql += ' AND domain_id = ?'
    params.push(domainId)
  }

  sql += ' GROUP BY question, answer'

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const rows = (results || []).map((r: any) => ({
    question: r.question,
    answer: r.answer,
    ...computeAccuracyRow(r),
  }))
  const summary = computeStatsSummary(rows)
  return c.json({ category, summary, rows })
})

// Performance analytics
app.get('/api/performance', async (c) => {
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

  // Summary statistics
  const totalSessions = dailyData.reduce((a, b) => a + b.sessions, 0)
  const totalQuestions = dailyData.reduce((a, b) => a + b.questions, 0)
  const studyDays = dailyData.filter(d => d.sessions > 0).length
  const avgQuestionsPerSession = totalSessions > 0 ? Math.round((totalQuestions / totalSessions) * 10) / 10 : 0
  
  // Calculate overall accuracy weighted by questions answered, not sessions
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
    daily: dailyData.reverse(), // Show chronological order (oldest first)
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

// Intelligent auto-start session - with optional domain filtering
app.post('/api/sessions/auto-start', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const domainId = body.domain_id || 'chinese' // Default to chinese for backward compatibility

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
      mode: 'srs_sets',
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

  // Priority 2: Struggling cards (< 80% accuracy) + new cards
  // Auto-detect user progression through available content
  const availableSets = unlockedSets // Use all unlocked sets for the selected domain

  // Smart progression: start with early sets, expand as user improves
  let selected_sets: string[] = []
  if (availableSets.length > 0) {
    // Use first few sets, expanding based on overall progress
    const maxSets = Math.min(3, availableSets.length)
    selected_sets = availableSets.slice(0, maxSets)
  }

  // Focus on learning: hard + medium difficulties
  const sessionPayload = {
    mode: 'multi_set_difficulty',
    selected_sets,
    difficulty_levels: ['hard', 'medium'] as Array<'easy' | 'medium' | 'hard'>
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
app.get('/api/sessions/:id', async (c) => {
  const idParam = c.req.param('id')
  const id = c.env.SESSIONS.idFromString(idParam)
  const stub = c.env.SESSIONS.get(id)
  const res = await stub.fetch(new Request(new URL(`https://do/sessions/${idParam}`)))
  return c.newResponse(res.body, res)
})

// Asset serving and SPA fallback
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw)
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


