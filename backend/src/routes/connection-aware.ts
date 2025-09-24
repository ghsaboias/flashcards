import { Hono } from 'hono'

type Env = {
  DB: D1Database
  ASSETS: { fetch: typeof fetch }
  SESSIONS: DurableObjectNamespace
  API_TOKEN?: string
}

// Setup connection-aware learning routes
export function setupConnectionAwareRoutes(app: Hono<{ Bindings: Env }>) {

  // Get network data (clusters and connections) for a domain
  app.get('/api/network-data/:domain_id', async (c) => {
    const domainId = c.req.param('domain_id')

    // Get semantic clusters
    const clustersResult = await c.env.DB.prepare(`
      SELECT * FROM semantic_clusters WHERE domain_id = ? ORDER BY name
    `).bind(domainId).all()

    // Get character connections
    const connectionsResult = await c.env.DB.prepare(`
      SELECT * FROM character_connections WHERE domain_id = ? ORDER BY source_char, target_char
    `).bind(domainId).all()

    // Get cards with network data
    const cardsResult = await c.env.DB.prepare(`
      SELECT question, answer, semantic_domain, hub_score, cluster_role
      FROM cards
      WHERE domain_id = ? AND semantic_domain IS NOT NULL
      ORDER BY hub_score DESC
    `).bind(domainId).all()

    // Transform data to match KnowledgeGraphSession expected structure
    const clusters = clustersResult.results || []
    const connections = connectionsResult.results || []
    const cards = cardsResult.results || []

    // Transform cards to nodes format expected by KnowledgeGraphSession
    const nodes = cards.map((card: any) => ({
      id: card.question,
      char: card.question,
      pinyin: '', // Will be filled by frontend if needed
      semantic_domain: card.semantic_domain || 'other',
      hub_score: card.hub_score || 0,
      cluster_role: card.cluster_role || 'leaf',
      type: 'character'
    }))

    // Transform connections to links format expected by KnowledgeGraphSession
    const links = connections.map((conn: any) => ({
      source: conn.source_char,
      target: conn.target_char,
      type: conn.connection_type,
      strength: conn.strength || 1.0,
      compound_word: conn.compound_word
    }))

    return c.json({
      domain_id: domainId,
      nodes,
      links,
      clusters: clusters.map((cluster: any) => ({
        id: cluster.id,
        name: cluster.name,
        description: cluster.description || '',
        anchor_characters: JSON.parse(cluster.anchor_characters || '[]'),
        members: [], // Will be computed by frontend if needed
        unlock_prerequisites: JSON.parse(cluster.unlock_prerequisites || '[]')
      }))
    })
  })

  // Get user progress for connection-aware learning
  app.get('/api/user-progress/:domain_id', async (c) => {
    const domainId = c.req.param('domain_id')
    const userId = 'default_user' // TODO: implement proper user auth

    // Get cluster progress
    const progressResult = await c.env.DB.prepare(`
      SELECT * FROM cluster_progress
      WHERE domain_id = ? AND user_id = ?
      ORDER BY cluster_id
    `).bind(domainId, userId).all()

    // Get connection practice data
    const connectionPracticeResult = await c.env.DB.prepare(`
      SELECT * FROM connection_practice
      WHERE domain_id = ? AND user_id = ?
      ORDER BY success_rate ASC, times_practiced DESC
    `).bind(domainId, userId).all()

    return c.json({
      domain_id: domainId,
      user_id: userId,
      cluster_progress: progressResult.results || [],
      connection_practice: connectionPracticeResult.results || []
    })
  })

  // Update cluster progress
  app.post('/api/cluster-progress', async (c) => {
    const { domain_id, cluster_id, current_phase, completion_percentage, anchors_mastered } = await c.req.json()
    const userId = 'default_user'

    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO cluster_progress
      (user_id, domain_id, cluster_id, current_phase, completion_percentage, anchors_mastered, last_practiced, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(userId, domain_id, cluster_id, current_phase, completion_percentage, anchors_mastered).run()

    return c.json({ success: true })
  })

  // Update connection practice
  app.post('/api/connection-practice', async (c) => {
    const { domain_id, source_char, target_char, connection_type, correct } = await c.req.json()
    const userId = 'default_user'

    // Update or insert connection practice record
    await c.env.DB.prepare(`
      INSERT INTO connection_practice
      (user_id, domain_id, source_char, target_char, connection_type, times_practiced, times_correct, last_practiced, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id, domain_id, source_char, target_char, connection_type) DO UPDATE SET
        times_practiced = times_practiced + 1,
        times_correct = times_correct + ?,
        last_practiced = datetime('now'),
        updated_at = datetime('now')
    `).bind(userId, domain_id, source_char, target_char, connection_type, correct ? 1 : 0, correct ? 1 : 0).run()

    return c.json({ success: true })
  })

  // Get cluster overview with completion status
  app.get('/api/clusters/:domain_id', async (c) => {
    const domainId = c.req.param('domain_id')
    const userId = 'default_user'

    const result = await c.env.DB.prepare(`
      SELECT
        sc.id,
        sc.name,
        sc.description,
        sc.anchor_characters,
        COALESCE(cp.current_phase, 'discovery') as current_phase,
        COALESCE(cp.completion_percentage, 0) as completion_percentage,
        COALESCE(cp.anchors_mastered, 0) as anchors_mastered,
        COUNT(c.id) as total_characters,
        SUM(CASE WHEN c.cluster_role = 'anchor' THEN 1 ELSE 0 END) as anchor_count,
        AVG(c.hub_score) as avg_hub_score
      FROM semantic_clusters sc
      LEFT JOIN cluster_progress cp ON sc.id = cp.cluster_id AND cp.domain_id = sc.domain_id AND cp.user_id = ?
      LEFT JOIN cards c ON sc.domain_id = c.domain_id AND c.semantic_domain = sc.name
      WHERE sc.domain_id = ?
      GROUP BY sc.id, sc.name, sc.description, cp.current_phase, cp.completion_percentage, cp.anchors_mastered
      ORDER BY sc.name
    `).bind(userId, domainId).all()

    return c.json({
      domain_id: domainId,
      clusters: result.results || []
    })
  })
}