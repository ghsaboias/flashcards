# Backend (Cloudflare Worker) — Development Guide

Backend service built with Hono and Cloudflare Workers. Serves the REST API and static assets from `../frontend/dist` via Wrangler assets binding.

> **Main Documentation**: See `../CLAUDE.md` for complete project overview, efficient learning principles, and cross-module architecture.

## Overview
- **Runtime**: Cloudflare Workers (Wrangler)
- **Framework**: Hono (TypeScript) with modular utilities
- **Storage**: D1 (SQLite) bound as `DB` with multi-domain support
- **State**: Durable Object `SESSIONS` → class `SessionsDO`
- **Assets**: `[assets]` serves `../frontend/dist`
- **Auth**: Optional Bearer token via `Authorization: Bearer <API_TOKEN>`
- **Architecture**: Multi-domain spaced repetition system (Chinese HSK, World Geography)

## Multi-Domain Architecture

The backend supports multiple knowledge domains with independent progression:

- **Domains**: Chinese (HSK), World Geography, extensible for more
- **Independent Progress**: Each domain has separate unlock criteria and SRS tracking
- **Domain Filtering**: All endpoints support optional `domain_id` parameter
- **Smart Selection**: Auto-start API intelligently selects content based on domain and user level

## Quick Commands
```bash
cd backend
bun install
bun run dev         # Local worker on http://localhost:8787
bun run deploy      # Deploy to Cloudflare
bun run migrate     # Apply wrangler-managed D1 migrations
bun run schema:apply  # Execute ./schema.sql against bound DB
```

## Authentication
- All `/api/*` routes accept an optional Bearer token.
- If `API_TOKEN` is set (Wrangler secret or env), requests must include `Authorization: Bearer <API_TOKEN>`.
- If not set, API is open for local/dev.

## API Endpoints

### Core System
- `GET /api/health` — Health probe → `{ status: "ok" }`
- `*` (fallback) — Serves built frontend assets via `ASSETS.fetch`

### Multi-Domain Support
- `GET /api/domains` — List available knowledge domains
  - Response: `[{ id: string, name: string, icon: string, has_audio: boolean }]`
  - Domains: `chinese` (HSK), `geography` (World Geography)

### Domain-Aware Data
- `GET /api/sets?domain_id=<domain>` — List sets filtered by domain → `[set_key]`
- `GET /api/categories?domain_id=<domain>` — List categories filtered by domain → `[category_key]`
- `GET /api/srs/set?set_name=...&domain_id=<domain>` — SRS fields for a set
  - Response: `[{ set_name, question, answer, easiness_factor, interval_hours, repetitions, next_review_date }]`
- `GET /api/srs/domain?domain_id=<domain>&set_name=<optional>` — Aggregated SRS rows for the domain (optional multi-set filter)
  - Response: `{ domain_id, applied_sets, rows }`
- `GET /api/stats/set?set_name=...&domain_id=<domain>` — Accuracy + counts per card
  - Response: `{ set_name, summary, rows }`
- `GET /api/stats/domain?domain_id=<domain>&set_name=<optional>` — Domain-wide accuracy summary (optional multi-set filter)
  - Response: `{ domain_id, applied_sets, summary, rows }`
- `GET /api/performance?domain_id=<optional>` — Daily performance summary (global or domain-specific)
  - Response: `{ summary, daily }`

### High-Intensity Learning
- `POST /api/sessions/auto-start` — **Intelligent session creation with connection-aware learning** (Recommended)
  - Body: `{ user_level: 'beginner'|'intermediate'|'advanced', focus_mode: 'review'|'challenge', domain_id?: string, connection_aware?: boolean }`
  - Features: Smart content selection, adaptive difficulty, 20-question cap, **semantic character relationships**
  - **Connection-Aware Mode**: When `connection_aware: true`, characters are selected based on semantic relationships rather than random selection
  - Response: `{ session_id, done, card?, progress }`

### Traditional Sessions
- `POST /api/sessions/start` — Manual session creation (Durable Object)
  - Body: `{ mode, selected_sets?, difficulty_levels?, review_items? }`
  - Modes: `multi_set_all | multi_set_difficult | multi_set_srs | review_incorrect`
  - Response: `{ session_id, done, card?, progress }`

### Session Management
- `GET /api/sessions/:id` — Get session state → `{ done, progress, current_question, results }`
- `POST /api/sessions/:id/answer` — Submit answer with timing analytics
  - Body: `{ answer: string, response_time_ms: number }`
  - Response: Includes `feedback_duration_ms` and difficulty assessment

## Database (D1)

### Schema Overview
- **Schema file**: `backend/schema.sql`
- **Database ID**: `98e5c374-ba8d-4cce-8490-10a3414fba0a`
- **Multi-domain support**: `domains` table with `domain_id` foreign keys
- **Performance**: Indexed on category/set/question+answer/next_review_date

### Core Tables

```sql
-- Multi-domain support
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  has_audio INTEGER NOT NULL DEFAULT 0
);

-- Flashcards with domain association
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL DEFAULT 'chinese',
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
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  UNIQUE(domain_id, category_key, set_key, question, answer)
);

-- Session tracking with performance analytics
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

-- Detailed session events for analytics
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

-- Simple key-value config store
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Connection-aware learning tables
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

-- Character relationships for semantic learning
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
```

### Common Queries

**Using Cloudflare MCP tools** (recommended):
```sql
-- List domains
SELECT * FROM domains;

-- Recent sessions with performance
SELECT domain_id, category_key, set_key, question, answer, next_review_date
FROM cards
WHERE next_review_date <= datetime('now')
  AND domain_id = 'chinese'
ORDER BY next_review_date
LIMIT 20;

-- Progressive unlock status
SELECT set_key,
       COUNT(*) as total_cards,
       SUM(correct_count) as total_correct,
       SUM(reviewed_count) as total_reviewed,
       ROUND(AVG(CASE WHEN reviewed_count > 0
                 THEN (correct_count * 100.0 / reviewed_count)
                 ELSE 0 END), 1) as accuracy
FROM cards
WHERE domain_id = 'chinese'
GROUP BY set_key
ORDER BY set_key;
```

## Durable Objects

### SessionsDO (`src/sessions-do.ts`)
- **Namespace binding**: `SESSIONS`
- **Responsibilities**:
  - Session lifecycle management (start/answer/complete)
  - Real-time SRS algorithm updates (SM-2 based)
  - Performance analytics and timing tracking
  - Progressive unlock enforcement
  - Domain-aware content filtering
  - **Connection-aware character selection based on semantic relationships**

### Key Features
- **Intelligent Auto-Start**: Selects optimal cards based on user level and domain
- **Connection-Aware Learning**: Semantic character clustering using `character_connections` table - FIXED
- **Struggling Character Prioritization**: Identifies characters with <80% accuracy for targeted practice
- **Semantic Ordering**: Preserves meaningful character relationships instead of random shuffling
- **Adaptive Timing**: Calculates feedback duration (2-6s) based on difficulty/speed
- **Priority Scoring**: SRS due (+100), struggling sets (+80), active learning (+60)
- **Session Limits**: 20-question cap, max 2 sets per session
- **Database Query Fix**: Resolved parameter binding error in connection-aware selection logic

## Configuration (wrangler.toml)
- `main = "src/worker.ts"`
- `[assets]` → `directory = "../frontend/dist"`, `binding = "ASSETS"`
- `[[d1_databases]]` → `binding = "DB"`, `database_name = "flashcards"`, `database_id = "98e5c374-ba8d-4cce-8490-10a3414fba0a"`
- `[durable_objects]` → `bindings = [{ name = "SESSIONS", class_name = "SessionsDO" }]`
- `[[routes]]` → `pattern = "game.fasttakeoff.org/*"`, `zone_name = "fasttakeoff.org"`

## Troubleshooting
- 401 Unauthorized: set `API_TOKEN` or remove header; ensure `Authorization: Bearer <token>` matches env.
- 404 assets: build frontend first (`cd ../frontend && bun run build`).
- D1 errors: verify DB binding name (`DB`) and `database_id` in `wrangler.toml`.
- DO migration problems: ensure class name `SessionsDO` is listed under `[[migrations]]` and active.
- Logs: `bunx wrangler tail` for live traces.

## Modular Architecture

### Directory Structure
```
backend/
├── src/
│   ├── worker.ts              # Hono app + domain-aware routes
│   ├── sessions-do.ts         # Durable Object with intelligent session mgmt
│   ├── srs.ts                 # SM-2 SRS algorithm (38 lines)
│   ├── types.ts               # Shared TypeScript definitions (58 lines)
│   └── utils/                 # Extracted utility functions
│       ├── validateAnswer.ts  # Answer validation logic (13 lines)
│       ├── db-queries.ts      # Database query utilities (271 lines)
│       ├── stats-utils.ts     # Statistics computation (77 lines)
│       └── difficulty-utils.ts # Difficulty assessment (22 lines)
├── migrations/                # D1 database migrations
│   ├── 0001_add_domains_table.sql
│   ├── 0002_add_domain_id_to_cards.sql
│   └── 0003_add_geography_domain.sql
├── schema.sql                 # Complete D1 schema
├── seed-hsk1.sql             # HSK Level 1 sample data
├── wrangler.toml             # Cloudflare Worker configuration
├── package.json              # Dependencies (Hono 4.9.8, TS 5.9.2)
└── bun.lock                  # Lockfile
```

### Utility Modules
- **`db-queries.ts`**: Centralized database operations with domain filtering
- **`stats-utils.ts`**: Performance analytics and aggregation functions
- **`difficulty-utils.ts`**: Smart difficulty assessment based on response patterns
- **`validateAnswer.ts`**: Flexible answer validation (exact match, trimmed, case-insensitive)

### Key Files
- **`worker.ts`**: Main API router with domain-aware endpoints
- **`sessions-do.ts`**: Stateful session management with intelligent card selection
- **`srs.ts`**: Lightweight SM-2 spaced repetition implementation

> **Frontend Integration**: See `../frontend/CLAUDE.md` for React app architecture and session management hooks.
