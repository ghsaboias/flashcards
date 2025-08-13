import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { SessionsDO as SessionsDOClass } from './sessions-do'

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

// Sets
app.get('/api/sets', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT DISTINCT set_key FROM cards ORDER BY set_key'
  ).all()
  return c.json((results || []).map((r: any) => r.set_key))
})

// Categories
app.get('/api/categories', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT DISTINCT category_key FROM cards ORDER BY category_key'
  ).all()
  return c.json((results || []).map((r: any) => r.category_key))
})

// SRS: by set
app.get('/api/srs/set', async (c) => {
  const setName = c.req.query('set_name') || ''
  if (!setName) return c.json([], 200)
  const { results } = await c.env.DB.prepare(
    `SELECT question, answer, easiness_factor, interval_hours, repetitions, next_review_date
     FROM cards WHERE set_key = ?`
  ).bind(setName).all()
  const rows = (results || []).map((r: any) => ({
    set_name: setName,
    question: r.question,
    answer: r.answer,
    easiness_factor: r.easiness_factor ?? 2.5,
    interval_hours: r.interval_hours ?? 0,
    repetitions: r.repetitions ?? 0,
    next_review_date: r.next_review_date ?? '1970-01-01 00:00:00',
  }))
  return c.json(rows)
})

// SRS: by category
app.get('/api/srs/category', async (c) => {
  const category = c.req.query('category') || ''
  if (!category) return c.json([], 200)
  const { results } = await c.env.DB.prepare(
    `SELECT set_key, question, answer, easiness_factor, interval_hours, repetitions, next_review_date
     FROM cards WHERE category_key = ?`
  ).bind(category).all()
  const rows = (results || []).map((r: any) => ({
    set_name: r.set_key,
    question: r.question,
    answer: r.answer,
    easiness_factor: r.easiness_factor ?? 2.5,
    interval_hours: r.interval_hours ?? 0,
    repetitions: r.repetitions ?? 0,
    next_review_date: r.next_review_date ?? '1970-01-01 00:00:00',
  }))
  return c.json(rows)
})

// Stats helpers
function computeAccuracyRow(r: any) {
  const correct = Number(r.correct) || 0
  const incorrect = Number(r.incorrect) || 0
  const reviewed = Number(r.reviewed) || 0
  const attempts = reviewed > 0 ? reviewed : correct + incorrect
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 1000) / 10 : 0
  return { correct, incorrect, total: attempts, accuracy }
}

// Stats: by set
app.get('/api/stats/set', async (c) => {
  const setName = c.req.query('set_name') || ''
  if (!setName) return c.json({ set_name: '', summary: { correct: 0, incorrect: 0, total: 0, accuracy: 0, total_cards: 0, attempted_cards: 0, difficult_count: 0 }, rows: [] })
  const { results } = await c.env.DB.prepare(
    `SELECT question, answer, correct_count AS correct, incorrect_count AS incorrect, reviewed_count AS reviewed
     FROM cards WHERE set_key = ?`
  ).bind(setName).all()
  const rows = (results || []).map((r: any) => ({
    question: r.question,
    answer: r.answer,
    ...computeAccuracyRow(r),
  }))
  const total_correct = rows.reduce((a, b) => a + b.correct, 0)
  const total_incorrect = rows.reduce((a, b) => a + b.incorrect, 0)
  const total_attempts = total_correct + total_incorrect
  const accuracy = total_attempts > 0 ? Math.round((total_correct / total_attempts) * 1000) / 10 : 0
  const attempted_cards = rows.filter(r => (r.correct + r.incorrect) > 0).length
  const difficult_count = rows.filter(r => (r.correct + r.incorrect) > 0 && r.accuracy < 80).length
  return c.json({
    set_name: setName,
    summary: { correct: total_correct, incorrect: total_incorrect, total: total_attempts, accuracy, total_cards: rows.length, attempted_cards, difficult_count },
    rows,
  })
})

// Stats: by category (merge by question+answer)
app.get('/api/stats/category', async (c) => {
  const category = c.req.query('category') || ''
  if (!category) return c.json({ category: '', summary: { correct: 0, incorrect: 0, total: 0, accuracy: 0, total_cards: 0, attempted_cards: 0, difficult_count: 0 }, rows: [] })
  const { results } = await c.env.DB.prepare(
    `SELECT question, answer,
            SUM(correct_count)   AS correct,
            SUM(incorrect_count) AS incorrect,
            SUM(CASE WHEN reviewed_count > 0 THEN reviewed_count ELSE correct_count + incorrect_count END) AS reviewed
     FROM cards WHERE category_key = ?
     GROUP BY question, answer`
  ).bind(category).all()
  const rows = (results || []).map((r: any) => ({
    question: r.question,
    answer: r.answer,
    ...computeAccuracyRow(r),
  }))
  const total_correct = rows.reduce((a, b) => a + b.correct, 0)
  const total_incorrect = rows.reduce((a, b) => a + b.incorrect, 0)
  const total_attempts = total_correct + total_incorrect
  const accuracy = total_attempts > 0 ? Math.round((total_correct / total_attempts) * 1000) / 10 : 0
  const attempted_cards = rows.filter(r => (r.correct + r.incorrect) > 0).length
  const difficult_count = rows.filter(r => (r.correct + r.incorrect) > 0 && r.accuracy < 80).length
  return c.json({ category, summary: { correct: total_correct, incorrect: total_incorrect, total: total_attempts, accuracy, total_cards: rows.length, attempted_cards, difficult_count }, rows })
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


