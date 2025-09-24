-- Migration: Add user progress tracking for connection-aware learning

-- Track user progress through semantic clusters
CREATE TABLE IF NOT EXISTS cluster_progress (
  user_id TEXT NOT NULL DEFAULT 'default_user', -- For future multi-user support
  domain_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  current_phase TEXT NOT NULL DEFAULT 'discovery' CHECK(current_phase IN ('discovery', 'anchor', 'expansion', 'integration', 'mastery')),
  completion_percentage REAL NOT NULL DEFAULT 0.0,
  anchors_mastered INTEGER NOT NULL DEFAULT 0,
  total_anchors INTEGER NOT NULL DEFAULT 0,
  unlock_date TEXT, -- When this cluster was unlocked
  last_practiced TEXT, -- Last practice session in this cluster
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  PRIMARY KEY (user_id, domain_id, cluster_id),
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  FOREIGN KEY (cluster_id) REFERENCES semantic_clusters(id)
);

-- Track practice of character relationships (connection strength)
CREATE TABLE IF NOT EXISTS connection_practice (
  user_id TEXT NOT NULL DEFAULT 'default_user',
  domain_id TEXT NOT NULL,
  source_char TEXT NOT NULL,
  target_char TEXT NOT NULL,
  connection_type TEXT NOT NULL,
  times_practiced INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  success_rate REAL GENERATED ALWAYS AS (
    CASE WHEN times_practiced > 0
    THEN ROUND((times_correct * 100.0) / times_practiced, 2)
    ELSE 0.0 END
  ) STORED,
  first_practiced TEXT, -- First time this connection was practiced
  last_practiced TEXT, -- Most recent practice
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  PRIMARY KEY (user_id, domain_id, source_char, target_char, connection_type),
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);

CREATE INDEX IF NOT EXISTS idx_connection_practice_user_domain ON connection_practice(user_id, domain_id);
CREATE INDEX IF NOT EXISTS idx_connection_practice_success_rate ON connection_practice(success_rate);