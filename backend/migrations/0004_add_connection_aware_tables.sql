-- Migration: Add connection-aware learning tables
-- Phase 1: Core network structure

-- Semantic clusters (e.g., family, numbers, emotions)
CREATE TABLE IF NOT EXISTS semantic_clusters (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  anchor_characters TEXT, -- JSON array of character IDs
  unlock_prerequisites TEXT, -- JSON array of prerequisite cluster IDs
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  UNIQUE(domain_id, name)
);

-- Character relationships and connections
CREATE TABLE IF NOT EXISTS character_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  source_char TEXT NOT NULL,
  target_char TEXT NOT NULL,
  connection_type TEXT NOT NULL CHECK(connection_type IN ('semantic', 'radical', 'compound', 'phonetic')),
  strength REAL NOT NULL DEFAULT 1.0, -- Relationship strength (0-1)
  compound_word TEXT, -- If connection_type='compound', the resulting word
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  UNIQUE(domain_id, source_char, target_char, connection_type)
);

CREATE INDEX IF NOT EXISTS idx_connections_source ON character_connections(source_char);
CREATE INDEX IF NOT EXISTS idx_connections_target ON character_connections(target_char);
CREATE INDEX IF NOT EXISTS idx_connections_type ON character_connections(connection_type);