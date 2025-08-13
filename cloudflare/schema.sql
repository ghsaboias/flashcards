-- Flashcards D1 schema

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_key TEXT NOT NULL,
  set_key TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  reviewed_count INTEGER NOT NULL DEFAULT 0,
  easiness_factor REAL NOT NULL DEFAULT 2.5,
  interval_hours INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_date TEXT NOT NULL DEFAULT '1970-01-01 00:00:00',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  UNIQUE(category_key, set_key, question, answer)
);

CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category_key);
CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(set_key);
CREATE INDEX IF NOT EXISTS idx_cards_q_a ON cards(question, answer);
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review_date);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  practice_name TEXT,
  session_type TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds REAL,
  correct_count INTEGER,
  total INTEGER
);

CREATE TABLE IF NOT EXISTS session_events (
  session_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  card_id INTEGER,
  category_key TEXT,
  set_key TEXT,
  question TEXT NOT NULL,
  user_answer TEXT,
  correct_answer TEXT,
  correct INTEGER NOT NULL,
  duration_seconds REAL NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (session_id, position),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);


