import type { SessionCard } from '../types'

type Env = {
  DB: D1Database
}

// Connection-aware character selection based on semantic relationships
export async function applyConnectionAwareSelection(
  cards: SessionCard[],
  domainId: string,
  env: Env
): Promise<SessionCard[]> {
  try {
    // Get characters that need review based on performance
    const struggleCharacters = await getStruggleCharacters(cards, domainId, env)

    if (struggleCharacters.length === 0) {
      // No struggling characters, return original cards with semantic clustering
      return clusterBySemantics(cards, domainId, env)
    }

    // Find connected characters for struggling ones
    const connectedCards = await getConnectedCharacters(struggleCharacters, cards, domainId, env)

    // Limit to session size (20 characters max)
    const targetSize = Math.min(20, cards.length)

    // Prioritize: struggling chars + their semantic connections
    const selectedCards = [...struggleCharacters, ...connectedCards]
      .slice(0, targetSize)

    return selectedCards.length > 0 ? selectedCards : cards.slice(0, targetSize)
  } catch (error) {
    console.error('Connection-aware selection failed, falling back to random:', error)
    return cards
  }
}

// Get characters that are struggling (low accuracy, high frequency practice)
export async function getStruggleCharacters(
  cards: SessionCard[],
  domainId: string,
  env: Env
): Promise<SessionCard[]> {
  if (cards.length === 0) return []

  const questionsList = cards.map(c => c.question)
  const placeholders = questionsList.map(() => '?').join(',')

  const { results } = await env.DB.prepare(`
    SELECT question, correct_count, incorrect_count, reviewed_count
    FROM cards
    WHERE domain_id = ? AND question IN (${placeholders})
      AND reviewed_count >= 3
    ORDER BY
      CASE WHEN reviewed_count > 0
        THEN (correct_count * 100.0 / reviewed_count)
        ELSE 100
      END ASC,
      reviewed_count DESC
    LIMIT 8
  `).bind(domainId, ...questionsList).all()

  const strugglingQuestions = new Set(
    (results || [])
      .filter((r: any) => {
        const accuracy = r.reviewed_count > 0 ? (r.correct_count * 100.0 / r.reviewed_count) : 100
        return accuracy < 80 // Characters with < 80% accuracy
      })
      .map((r: any) => r.question)
  )

  return cards.filter(card => strugglingQuestions.has(card.question))
}

// Get characters connected to struggling ones via semantic relationships
export async function getConnectedCharacters(
  struggleCharacters: SessionCard[],
  allCards: SessionCard[],
  domainId: string,
  env: Env
): Promise<SessionCard[]> {
  if (struggleCharacters.length === 0) return []

  const struggleQuestions = struggleCharacters.map(c => c.question)
  const placeholders = struggleQuestions.map(() => '?').join(',')

  // Find characters connected to struggling ones
  const { results } = await env.DB.prepare(`
    SELECT DISTINCT
      CASE
        WHEN source_char IN (${placeholders}) THEN target_char
        WHEN target_char IN (${placeholders}) THEN source_char
      END as connected_char,
      connection_type,
      strength
    FROM character_connections
    WHERE domain_id = ?
      AND (source_char IN (${placeholders}) OR target_char IN (${placeholders}))
      AND connection_type IN ('semantic', 'compound', 'radical')
    ORDER BY
      CASE connection_type
        WHEN 'semantic' THEN 1
        WHEN 'compound' THEN 2
        WHEN 'radical' THEN 3
        ELSE 4
      END,
      strength DESC
    LIMIT 12
  `).bind(domainId, ...struggleQuestions, ...struggleQuestions, ...struggleQuestions, ...struggleQuestions).all()

  const connectedQuestions = new Set(
    (results || [])
      .map((r: any) => r.connected_char)
      .filter(Boolean)
  )

  // Return connected characters that are in our available cards
  const connectedCards = allCards.filter(card =>
    connectedQuestions.has(card.question) &&
    !struggleCharacters.some(sc => sc.question === card.question)
  )

  return connectedCards.slice(0, 12) // Limit connected characters
}

// Cluster cards by semantic relationships for better learning flow
export async function clusterBySemantics(
  cards: SessionCard[],
  domainId: string,
  env: Env
): Promise<SessionCard[]> {
  if (cards.length <= 5) return cards

  try {
    // Get semantic connections between our cards
    const questions = cards.map(c => c.question)
    const placeholders = questions.map(() => '?').join(',')

    const { results } = await env.DB.prepare(`
      SELECT source_char, target_char, connection_type, strength
      FROM character_connections
      WHERE domain_id = ?
        AND source_char IN (${placeholders})
        AND target_char IN (${placeholders})
        AND connection_type = 'semantic'
      ORDER BY strength DESC
    `).bind(domainId, ...questions, ...questions).all()

    if (!results || results.length === 0) {
      return cards // No connections found, return original order
    }

    // Build adjacency map
    const connections = new Map<string, string[]>()
    for (const r of results as any[]) {
      if (!connections.has(r.source_char)) connections.set(r.source_char, [])
      if (!connections.has(r.target_char)) connections.set(r.target_char, [])
      connections.get(r.source_char)!.push(r.target_char)
      connections.get(r.target_char)!.push(r.source_char)
    }

    // Create semantic clusters using graph traversal
    const visited = new Set<string>()
    const clusters: SessionCard[][] = []

    for (const card of cards) {
      if (visited.has(card.question)) continue

      const cluster = buildSemanticCluster(card, cards, connections, visited)
      if (cluster.length > 0) {
        clusters.push(cluster)
      }
    }

    // Flatten clusters while preserving grouping
    return clusters.flat().slice(0, 20)
  } catch (error) {
    console.error('Semantic clustering failed:', error)
    return cards
  }
}

// Build a semantic cluster starting from a character
export function buildSemanticCluster(
  startCard: SessionCard,
  allCards: SessionCard[],
  connections: Map<string, string[]>,
  visited: Set<string>
): SessionCard[] {
  const cluster = [startCard]
  visited.add(startCard.question)

  const queue = [startCard.question]
  const cardMap = new Map(allCards.map(c => [c.question, c]))

  while (queue.length > 0 && cluster.length < 6) {
    const current = queue.shift()!
    const connected = connections.get(current) || []

    for (const connectedChar of connected) {
      if (visited.has(connectedChar)) continue

      const connectedCard = cardMap.get(connectedChar)
      if (connectedCard) {
        cluster.push(connectedCard)
        visited.add(connectedChar)
        queue.push(connectedChar)

        if (cluster.length >= 6) break
      }
    }
  }

  return cluster
}