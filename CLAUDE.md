# Flashcards Project Brief

## Project Focus
- **Audience**: Single-user Mandarin learner (me). All product decisions optimise my study flow.
- **Stack**: React 19 + Vite in the frontend, Cloudflare Worker + Durable Object in the backend, Cloudflare D1 for storage.
- **Goal**: Keep the high-intensity SRS core stable while layering in connection-aware experiments for Chinese characters.

## Knowledge Graph Status
- **Connection-aware quick start** – The home page defaults the Chinese domain to `semantic` mode. When the backend confirms network data, the quick-start button launches a session seeded by `KnowledgeGraphSession` and marks the session as connection-aware.
- **Practice integrations** – `MiniNetworkViewer` renders related characters inside the question view whenever the session payload includes `connection_session` metadata. LiveProgressNetwork concepts remain exploratory and are not currently rendered.
- **Network explorer route** – `/network` lazy-loads a D3-based graph fed by `frontend/public/hsk_network_data.json`. It supports zooming, dragging, basic filters, and tooltips.
- **Data generation** – `scripts/process_hsk_data.py` regenerates the JSON graph from `data/hsk30-expanded.csv`, keeping 218 nodes, 3,194 edges, hub scores, semantic domains, and cluster roles aligned with the app. Use it to refresh the dataset before committing curated changes.
- **Next experiments** – Re-introduce explicit cluster selection, surface five-phase progress UI once session heuristics settle, and finish loading the remaining relationship data into D1.

## Repository Layout (selected)
```
flashcards/
├── README.md                    # High-level summary (personal focus)
├── CLAUDE.md                    # This document
├── AGENTS.md                    # Process guidelines for contributors/agents
├── backend/
│   ├── schema.sql               # Baseline D1 schema
│   ├── migrations/              # Ordered migration history (0001+)
│   └── src/                     # Worker entrypoints + utilities
├── frontend/
│   ├── src/                     # React pages, components, hooks, utils
│   └── public/hsk_network_data.json
├── data/                        # Source datasets
│   └── hsk30-expanded.csv
├── docs/
│   ├── PRINCIPLES.md
│   ├── USER_FLOWS.md
│   └── knowledge-graph/         # Documentation + artefacts
│       ├── overview/            # Vision & working notes
│       ├── integration/         # Tech reference
│       ├── roadmap/             # Implementation plan
│       ├── gaps/                # Gap analysis
│       ├── testing/             # Manual test guide
│       ├── datasets/            # JSON exports used by docs/prototypes
│       ├── prototypes/          # Legacy D3 sandbox
│       └── procedures/          # Regeneration instructions
└── scripts/
    └── process_hsk_data.py
```

## Database Schema (D1)

**Database ID**: `98e5c374-ba8d-4cce-8490-10a3414fba0a`

### Core Tables

```sql
-- Multi-domain support
CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  has_audio BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now'))
);

-- Flashcards with domain association and network metadata
CREATE TABLE cards (
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
  domain_id TEXT REFERENCES domains(id),
  hub_score REAL DEFAULT 0.0,
  cluster_role TEXT DEFAULT 'leaf' CHECK(cluster_role IN ('anchor', 'branch', 'leaf')),
  semantic_domain TEXT,
  radical_family TEXT,
  UNIQUE(category_key, set_key, question, answer)
);

-- Session tracking
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  practice_name TEXT,
  session_type TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds REAL,
  correct_count INTEGER,
  total INTEGER
);

-- Detailed session events
CREATE TABLE session_events (
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

-- Key-value config store
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Connection-Aware Learning Tables

```sql
-- Semantic clusters for progressive unlock
CREATE TABLE semantic_clusters (
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

-- Character relationships
CREATE TABLE character_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  source_char TEXT NOT NULL,
  target_char TEXT NOT NULL,
  connection_type TEXT NOT NULL CHECK(connection_type IN ('semantic', 'radical', 'compound', 'phonetic')),
  strength REAL NOT NULL DEFAULT 1.0,
  compound_word TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  UNIQUE(domain_id, source_char, target_char, connection_type)
);

-- User progress through clusters
CREATE TABLE cluster_progress (
  user_id TEXT NOT NULL DEFAULT 'default_user',
  domain_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  current_phase TEXT NOT NULL DEFAULT 'discovery' CHECK(current_phase IN ('discovery', 'anchor', 'expansion', 'integration', 'mastery')),
  completion_percentage REAL NOT NULL DEFAULT 0.0,
  anchors_mastered INTEGER NOT NULL DEFAULT 0,
  total_anchors INTEGER NOT NULL DEFAULT 0,
  unlock_date TEXT,
  last_practiced TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  PRIMARY KEY (user_id, domain_id, cluster_id),
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  FOREIGN KEY (cluster_id) REFERENCES semantic_clusters(id)
);

-- Connection practice tracking
CREATE TABLE connection_practice (
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
  first_practiced TEXT,
  last_practiced TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
  PRIMARY KEY (user_id, domain_id, source_char, target_char, connection_type),
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);
```

### Indexes

```sql
CREATE INDEX idx_cards_category ON cards(category_key);
CREATE INDEX idx_cards_set ON cards(set_key);
CREATE INDEX idx_cards_q_a ON cards(question, answer);
CREATE INDEX idx_cards_next_review ON cards(next_review_date);
CREATE INDEX idx_cards_hub_score ON cards(hub_score DESC);
CREATE INDEX idx_cards_cluster_role ON cards(cluster_role);
CREATE INDEX idx_cards_semantic_domain ON cards(semantic_domain);
CREATE INDEX idx_connections_source ON character_connections(source_char);
CREATE INDEX idx_connections_target ON character_connections(target_char);
CREATE INDEX idx_connections_type ON character_connections(connection_type);
CREATE INDEX idx_connection_practice_user_domain ON connection_practice(user_id, domain_id);
CREATE INDEX idx_connection_practice_success_rate ON connection_practice(success_rate);
```

## Cross-Reference Guides
- **Frontend details** – `frontend/CLAUDE.md`
- **Backend APIs & schema** – `backend/CLAUDE.md`
- **Change history** – `CHANGELOG.md`
- **User interaction map** – `docs/USER_FLOWS.md`
- **Knowledge graph design + backlog** – `docs/knowledge-graph/overview/KNOWLEDGE_GRAPH_QUEST.md`

## Development Workflow
1. Use Bun for scripts (`bunx vite`, `bunx wrangler dev`, etc.).
2. Keep TypeScript strict mode passing and ESLint clean.
3. When regenerating network data, commit curated JSON only—avoid ad-hoc CSV exports.
4. Manual smoke tests: run the frontend dev server, confirm quick start toggles both modes, and verify `/network` loads.
5. Autobuild check before sharing work: `bunx tsc -b && bunx vite build` then `bunx eslint .` inside `frontend`.
6. **Commit messages**: Keep them clean and professional. NEVER add Claude Code attribution or co-author tags.

## Testing Notes
- Automated tests are minimal; `frontend/src/tests/navigationFlow-simple.test.ts` documents the expected manual checks.
- When the connection-aware API is unavailable, the frontend gracefully falls back to random sessions; confirm this path manually after changes touching the network features.

## Pending Items to Track
- Populate D1 with the full connection graph to unlock richer suggestions.
- Revisit UX around cluster choice and multi-phase progress visuals.
- Expand documentation once new flows (e.g., visual progress network) ship so the knowledge graph guides stay truthful.
