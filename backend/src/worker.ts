import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { SessionsDO as SessionsDOClass } from './sessions-do'
import { fetchCards, mapToSrsRow, buildCardQuery } from './utils/db-queries'
import { computeAccuracyRow, computeStatsSummary, createEmptyStatsSummary } from './utils/stats-utils'
import { handleAutoStart } from './routes/auto-start'
import { handlePerformanceAnalytics } from './routes/analytics'
import { setupConnectionAwareRoutes } from './routes/connection-aware'

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
app.get('/api/performance', handlePerformanceAnalytics)


// Intelligent auto-start session - with optional domain filtering
app.post('/api/sessions/auto-start', handleAutoStart)

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
app.post('/api/sessions/:id/play-again', async (c) => {
  const idParam = c.req.param('id')
  const id = c.env.SESSIONS.idFromString(idParam)
  const stub = c.env.SESSIONS.get(id)
  const res = await stub.fetch(new Request(new URL(`https://do/sessions/${idParam}/play-again`), { method: 'POST' }))
  return c.newResponse(res.body, res)
})

// Setup connection-aware learning routes
setupConnectionAwareRoutes(app)

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
