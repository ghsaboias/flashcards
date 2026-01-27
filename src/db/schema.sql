-- Decks
CREATE TABLE IF NOT EXISTS decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL UNIQUE -- 'country-capital', 'flag-country', etc.
);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id INTEGER NOT NULL REFERENCES decks(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  UNIQUE(deck_id, front, back)
);

-- Review state per card (per user for future multi-user)
CREATE TABLE IF NOT EXISTS review_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id),
  user_id TEXT NOT NULL DEFAULT 'default',
  interval INTEGER NOT NULL DEFAULT 0,
  repetition INTEGER NOT NULL DEFAULT 0,
  efactor REAL NOT NULL DEFAULT 2.5,
  due_date TEXT NOT NULL DEFAULT (date('now')),
  UNIQUE(card_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_review_due ON review_state(user_id, due_date);
