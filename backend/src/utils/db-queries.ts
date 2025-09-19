import type { SessionCard } from '../types'

// Field sets for different query needs
const FIELD_SETS = {
  basic: 'id, category_key, set_key, question, answer',
  full: 'id, category_key, set_key, question, answer, correct_count, incorrect_count, reviewed_count, easiness_factor, interval_hours, repetitions',
  srs: 'question, answer, easiness_factor, interval_hours, repetitions, next_review_date',
  srs_with_set: 'set_key, question, answer, easiness_factor, interval_hours, repetitions, next_review_date',
  distinct_sets: 'DISTINCT set_key'
} as const

type FieldSet = keyof typeof FIELD_SETS

// WHERE clause builders
interface QueryOptions {
  fields: FieldSet
  where?: 'set' | 'multi_set' | 'srs_due' | 'multi_set_srs_due' | 'exact_match' | 'question_answer' | 'none'
  orderBy?: string
  limit?: number
}

interface CardQueryBuilder {
  sql: string
  paramCount: number
}

export function buildCardQuery(options: QueryOptions): CardQueryBuilder {
  const { fields, where = 'none', orderBy, limit } = options

  let sql = `SELECT ${FIELD_SETS[fields]} FROM cards`
  let paramCount = 0

  // Add WHERE clauses
  switch (where) {
    case 'set':
      sql += ' WHERE set_key = ?'
      paramCount = 1
      break
    case 'multi_set':
      // Placeholder count will be determined by caller
      sql += ' WHERE set_key IN'
      paramCount = -1 // Special case - caller handles placeholders
      break
    case 'srs_due':
      sql += ' WHERE datetime(next_review_date) <= CURRENT_TIMESTAMP'
      paramCount = 0
      break
    case 'multi_set_srs_due':
      // Special case for multi-set SRS due queries
      sql += ' WHERE set_key IN'
      paramCount = -2 // Special case - caller handles placeholders + SRS condition
      break
    case 'exact_match':
      sql += ' WHERE set_key = ? AND question = ? AND answer = ?'
      paramCount = 3
      break
    case 'question_answer':
      sql += ' WHERE question = ? AND answer = ?'
      paramCount = 2
      break
  }

  // Add ORDER BY
  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`
  }

  // Add LIMIT
  if (limit) {
    sql += ` LIMIT ${limit}`
  }

  return { sql, paramCount }
}

// Multi-set query helper
export function buildMultiSetQuery(options: Omit<QueryOptions, 'where'>, setCount: number): string {
  const placeholders = Array(setCount).fill('?').join(',')
  const { sql } = buildCardQuery({ ...options, where: 'multi_set' })
  return sql.replace(' WHERE set_key IN', ` WHERE set_key IN (${placeholders})`)
}

// Multi-set SRS due query helper
export function buildMultiSetSrsQuery(options: Omit<QueryOptions, 'where'>, setCount: number, limit?: number): string {
  const placeholders = Array(setCount).fill('?').join(',')
  const { sql } = buildCardQuery({ ...options, where: 'multi_set_srs_due' })

  let query = sql.replace(' WHERE set_key IN', ` WHERE set_key IN (${placeholders}) AND datetime(next_review_date) <= CURRENT_TIMESTAMP`)

  // Add priority ordering: most overdue first
  query += ` ORDER BY (julianday('now') - julianday(next_review_date)) DESC`

  if (limit) {
    query += ` LIMIT ${limit}`
  }

  return query
}


// SRS row mapping utility
export interface SrsRow {
  set_name: string
  question: string
  answer: string
  easiness_factor: number
  interval_hours: number
  repetitions: number
  next_review_date: string
}

export function mapToSrsRow(dbRow: any, setName?: string): SrsRow {
  return {
    set_name: setName || dbRow.set_key || '',
    question: dbRow.question,
    answer: dbRow.answer,
    easiness_factor: dbRow.easiness_factor ?? 2.5,
    interval_hours: dbRow.interval_hours ?? 0,
    repetitions: dbRow.repetitions ?? 0,
    next_review_date: dbRow.next_review_date ?? '1970-01-01 00:00:00',
  }
}

// Card transformation utility
export function mapToSessionCard(dbRow: any): SessionCard {
  return {
    id: dbRow.id,
    category_key: dbRow.category_key,
    set_key: dbRow.set_key,
    question: dbRow.question,
    answer: dbRow.answer,
  }
}

// SRS data extraction
export interface SrsData {
  easiness_factor: number
  interval_hours: number
  repetitions: number
}

export function extractSrsData(dbRow: any): SrsData {
  return {
    easiness_factor: dbRow.easiness_factor ?? 2.5,
    interval_hours: dbRow.interval_hours ?? 0,
    repetitions: dbRow.repetitions ?? 0,
  }
}

// Card fetching utility with deduplication support
export async function fetchCards(
  db: D1Database,
  options: QueryOptions,
  bindings: any[] = [],
  deduplicate = false
): Promise<{ cards: SessionCard[], metadata: any[] }> {
  const { sql } = buildCardQuery(options)
  const { results } = await db.prepare(sql).bind(...bindings).all()

  let cardsWithMetadata = (results || []) as any[]

  // Apply deduplication if needed (category queries)
  if (deduplicate) {
    const map = new Map<string, any>()
    cardsWithMetadata.forEach((r) => {
      const key = `${r.question}||${r.answer}`
      if (!map.has(key)) map.set(key, r)
    })
    cardsWithMetadata = Array.from(map.values())
  }

  const cards = cardsWithMetadata.map(mapToSessionCard)

  return { cards, metadata: cardsWithMetadata }
}

// Multi-set fetch utility
export async function fetchMultiSetCards(
  db: D1Database,
  options: Omit<QueryOptions, 'where'>,
  setNames: string[],
  deduplicate = false
): Promise<{ cards: SessionCard[], metadata: any[] }> {
  if (setNames.length === 0) {
    return { cards: [], metadata: [] }
  }

  const sql = buildMultiSetQuery(options, setNames.length)
  const { results } = await db.prepare(sql).bind(...setNames).all()

  let cardsWithMetadata = (results || []) as any[]

  if (deduplicate) {
    const map = new Map<string, any>()
    cardsWithMetadata.forEach((r) => {
      const key = `${r.question}||${r.answer}`
      if (!map.has(key)) map.set(key, r)
    })
    cardsWithMetadata = Array.from(map.values())
  }

  const cards = cardsWithMetadata.map(mapToSessionCard)

  return { cards, metadata: cardsWithMetadata }
}

// Multi-set SRS due fetch utility
export async function fetchMultiSetSrsCards(
  db: D1Database,
  options: Omit<QueryOptions, 'where'>,
  setNames: string[],
  limit?: number,
  deduplicate = false
): Promise<{ cards: SessionCard[], metadata: any[] }> {
  if (setNames.length === 0) {
    return { cards: [], metadata: [] }
  }

  const sql = buildMultiSetSrsQuery(options, setNames.length, limit)
  const { results } = await db.prepare(sql).bind(...setNames).all()

  let cardsWithMetadata = (results || []) as any[]

  if (deduplicate) {
    const map = new Map<string, any>()
    cardsWithMetadata.forEach((r) => {
      const key = `${r.question}||${r.answer}`
      if (!map.has(key)) map.set(key, r)
    })
    cardsWithMetadata = Array.from(map.values())
  }

  const cards = cardsWithMetadata.map(mapToSessionCard)

  return { cards, metadata: cardsWithMetadata }
}

