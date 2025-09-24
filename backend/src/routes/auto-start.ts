import { Context } from 'hono'
import { getUnlockedSets } from '../utils/unlock-system'
import { selectOptimalSets, analyzeSessionCards } from '../utils/session-intelligence'

type Env = {
  DB: D1Database
  ASSETS: { fetch: typeof fetch }
  SESSIONS: DurableObjectNamespace
  API_TOKEN?: string
}

// Main auto-start handler
export async function handleAutoStart(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json().catch(() => ({}))
  const domainId = body.domain_id || 'chinese' // Default to chinese for backward compatibility
  const skipNewCardCheck = body.skip_new_card_check || false // Allow bypassing the check
  const connectionAware = body.connection_aware || false // Enable connection-aware mode

  // Optimized: Get unlocked sets and their priorities in a single query
  const optimalSetsQuery = `
    WITH set_stats AS (
      SELECT
        set_key,
        SUM(correct_count) as total_correct,
        SUM(incorrect_count) as total_incorrect,
        SUM(CASE WHEN reviewed_count > 0 THEN reviewed_count ELSE correct_count + incorrect_count END) as total_attempts,
        COUNT(*) as total_cards,
        SUM(CASE WHEN datetime(next_review_date) <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as due_cards
      FROM cards
      WHERE domain_id = ?
      GROUP BY set_key
    ),
    unlock_status AS (
      SELECT
        s.set_key,
        s.total_correct,
        s.total_attempts,
        s.due_cards,
        CASE WHEN s.total_attempts > 0 THEN (s.total_correct * 100.0 / s.total_attempts) ELSE 0 END as accuracy,
        -- Check unlock status
        CASE
          WHEN s.set_key = 'HSK1_Set_01' OR s.set_key = 'Recognition_Practice/HSK_Level_1/HSK1_Set_01' THEN 1
          WHEN s.set_key LIKE '%HSK1_Set_%' THEN
            CASE WHEN EXISTS (
              SELECT 1 FROM set_stats prev
              WHERE prev.set_key = SUBSTR(s.set_key, 1, LENGTH(s.set_key) - 2) || PRINTF('%02d', CAST(SUBSTR(s.set_key, -2) AS INTEGER) - 1)
                AND prev.total_attempts >= 10
                AND (prev.total_correct * 100.0 / prev.total_attempts) >= 70
            ) THEN 1 ELSE 0 END
          ELSE 1
        END as is_unlocked,
        -- Calculate priority score
        CASE
          WHEN due_cards > 0 THEN 100
          WHEN total_attempts > 10 AND (total_correct * 100.0 / total_attempts) < 80 THEN 80
          WHEN total_attempts >= 10 AND total_attempts <= 100 AND
               (total_correct * 100.0 / total_attempts) >= 80 AND
               (total_correct * 100.0 / total_attempts) < 90 THEN 60
          WHEN total_attempts > 0 AND total_attempts <= 10 THEN 40
          WHEN total_attempts > 100 AND (total_correct * 100.0 / total_attempts) > 90 THEN -50
          ELSE 0
        END as priority_score
      FROM set_stats s
    )
    SELECT set_key, due_cards, priority_score
    FROM unlock_status
    WHERE is_unlocked = 1 AND priority_score > 0
    ORDER BY priority_score DESC, set_key
    LIMIT 5
  `

  const { results: optimalSets } = await c.env.DB.prepare(optimalSetsQuery).bind(domainId).all()

  if (!optimalSets || optimalSets.length === 0) {
    // No sets available - return empty session
    return c.json({ error: 'No available sets for practice' }, 400)
  }

  // Get sets for analysis - use all optimal sets for comprehensive new card detection
  const selected_sets = (optimalSets as any[]).slice(0, 2).map(s => s.set_key) // Top 2 sets
  const difficulty_levels = ['hard', 'medium'] as Array<'easy' | 'medium' | 'hard'>

  // Check for new cards FIRST - before any mode selection
  if (!skipNewCardCheck) {
    const analysis = await analyzeSessionCards(c.env.DB, selected_sets, domainId, difficulty_levels)

    if (analysis.newCards > 0) {
      // Return preview instead of starting session
      return c.json({
        type: 'new_cards_detected',
        analysis: {
          ...analysis,
          message: `This session includes ${analysis.newCards} learning card${analysis.newCards > 1 ? 's' : ''} that need extra attention.`
        },
        options: {
          continue_with_new: {
            description: 'Start session with learning cards included',
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

  // Check if we have SRS due cards (priority score 100)
  const dueSets = (optimalSets as any[]).filter(s => s.priority_score === 100)

  if (dueSets.length > 0) {
    // SRS review mode - use sets with due cards
    const sessionPayload = {
      mode: 'multi_set_srs',
      selected_sets: dueSets.slice(0, 2).map(r => r.set_key), // Limit to 2 sets
      connection_aware: connectionAware,
      domain_id: domainId
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

  // If no new cards or user chose to continue, start the session
  const sessionPayload = {
    mode: 'multi_set_difficulty',
    selected_sets,
    difficulty_levels,
    exclude_new_cards: body.exclude_new_cards || false,
    connection_aware: connectionAware,
    domain_id: domainId
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