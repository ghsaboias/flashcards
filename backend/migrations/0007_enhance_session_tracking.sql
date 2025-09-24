-- Migration: Enhance session tracking for connection-aware learning

-- Extend session_events to track connection-aware sessions
ALTER TABLE session_events ADD COLUMN connection_type TEXT;
ALTER TABLE session_events ADD COLUMN related_character TEXT; -- Character this was practiced in relation to
ALTER TABLE session_events ADD COLUMN session_phase TEXT CHECK(session_phase IN ('discovery', 'anchor', 'expansion', 'integration', 'mastery'));
ALTER TABLE session_events ADD COLUMN cluster_id TEXT;

-- Track which clusters were involved in each session
CREATE TABLE IF NOT EXISTS session_clusters (
  session_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  characters_practiced INTEGER NOT NULL DEFAULT 0,
  connections_practiced INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, cluster_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (cluster_id) REFERENCES semantic_clusters(id)
);