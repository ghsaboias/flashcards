-- Migration: Add analytics views for connection-aware learning insights

-- Track learning velocity by semantic domain
CREATE VIEW IF NOT EXISTS learning_velocity AS
SELECT
  cp.domain_id,
  cp.cluster_id,
  sc.name as cluster_name,
  cp.current_phase,
  cp.completion_percentage,
  cp.anchors_mastered,
  cp.total_anchors,
  ROUND(AVG(conn.success_rate), 2) as avg_connection_strength,
  COUNT(conn.source_char) as connections_practiced,
  cp.last_practiced
FROM cluster_progress cp
LEFT JOIN semantic_clusters sc ON cp.cluster_id = sc.id
LEFT JOIN connection_practice conn ON cp.domain_id = conn.domain_id
  AND cp.user_id = conn.user_id
GROUP BY cp.user_id, cp.domain_id, cp.cluster_id;

-- Find struggling connections (low success rate, high practice count)
CREATE VIEW IF NOT EXISTS struggling_connections AS
SELECT
  domain_id,
  source_char,
  target_char,
  connection_type,
  times_practiced,
  success_rate,
  last_practiced
FROM connection_practice
WHERE times_practiced >= 3
  AND success_rate < 70.0
ORDER BY times_practiced DESC, success_rate ASC;

-- Quick cluster overview
CREATE VIEW IF NOT EXISTS cluster_overview AS
SELECT
  sc.id,
  sc.name,
  sc.domain_id,
  COUNT(c.id) as total_characters,
  SUM(CASE WHEN c.cluster_role = 'anchor' THEN 1 ELSE 0 END) as anchor_count,
  AVG(c.hub_score) as avg_hub_score,
  COALESCE(cp.current_phase, 'locked') as user_phase,
  COALESCE(cp.completion_percentage, 0) as completion
FROM semantic_clusters sc
LEFT JOIN cards c ON sc.domain_id = c.domain_id AND c.semantic_domain = sc.name
LEFT JOIN cluster_progress cp ON sc.id = cp.cluster_id
GROUP BY sc.id, sc.name, sc.domain_id;

-- Network strength analysis
CREATE VIEW IF NOT EXISTS network_strength AS
SELECT
  source_char,
  COUNT(*) as total_connections,
  AVG(strength) as avg_connection_strength,
  SUM(CASE WHEN connection_type = 'semantic' THEN 1 ELSE 0 END) as semantic_connections,
  SUM(CASE WHEN connection_type = 'compound' THEN 1 ELSE 0 END) as compound_connections,
  SUM(CASE WHEN connection_type = 'radical' THEN 1 ELSE 0 END) as radical_connections
FROM character_connections
GROUP BY source_char
ORDER BY total_connections DESC;