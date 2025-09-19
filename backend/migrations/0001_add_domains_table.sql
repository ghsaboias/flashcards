-- Migration: Add domains table for multi-domain support
-- Date: 2025-09-18

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  has_audio BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now'))
);

-- Insert default Chinese domain for existing HSK data
INSERT INTO domains (id, name, icon, has_audio) VALUES
('chinese', 'Chinese (HSK)', '🇨🇳', 1);