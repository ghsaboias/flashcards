# Backend (Cloudflare Worker) — Development Guide

Backend service built with Hono and Cloudflare Workers. Serves the REST API and static assets from `../frontend/dist` via Wrangler assets binding.

## Overview
- Runtime: Cloudflare Workers (Wrangler)
- Framework: Hono (TypeScript)
- Storage: D1 (SQLite) bound as `DB`
- State: Durable Object `SESSIONS` → class `SessionsDO`
- Assets: `[assets]` serves `../frontend/dist`
- Auth: Optional Bearer token via `Authorization: Bearer <API_TOKEN>`

## Quick Commands
```bash
cd backend
npm install
npm run dev         # Local worker on http://localhost:8787
npm run deploy      # Deploy to Cloudflare
npm run migrate     # Apply wrangler-managed D1 migrations
npm run schema:apply  # Execute ./schema.sql against bound DB
```

## Authentication
- All `/api/*` routes accept an optional Bearer token.
- If `API_TOKEN` is set (Wrangler secret or env), requests must include `Authorization: Bearer <API_TOKEN>`.
- If not set, API is open for local/dev.

## API Endpoints
- `GET /api/health` — Health probe → `{ status: "ok" }`

- `GET /api/sets` — List available flashcard sets → `[set_key]`
- `GET /api/categories` — List available categories → `[category_key]`

- `GET /api/srs/set?set_name=...` — SRS fields for a set → `[{ set_name, question, answer, easiness_factor, interval_hours, repetitions, next_review_date }]`
- `GET /api/srs/category?category=...` — SRS fields for a category → `[{ set_name, question, answer, ... }]`

- `GET /api/stats/set?set_name=...` — Accuracy + counts per card, with summary → `{ set_name, summary, rows }`
- `GET /api/stats/category?category=...` — Aggregated accuracy across category → `{ category, summary, rows }`

- `GET /api/performance` — Daily performance summary → `{ summary, daily }`

- `POST /api/sessions/start` — Start a practice session (Durable Object)
  - Body: `{ mode, set_name?, category?, difficulty_levels?, selected_sets?, selected_categories?, review_items? }`
  - Modes: `set_all | category_all | difficulty_set | difficulty_category | srs_sets | srs_categories | multi_set_all | multi_set_difficulty | review_incorrect`
  - Response: `{ session_id, done, card?, progress }`

- `GET /api/sessions/:id` — Get session state → `{ done, progress, current_question, results }`
- `POST /api/sessions/:id/answer` — Submit `{ answer }`; returns next card or final results

- `*` (fallback) — Serves built frontend assets via `ASSETS.fetch`

## Database (D1)
- Schema file: `backend/schema.sql`
- Primary tables (excerpts):

```sql
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
```

- Additional: `settings(key primary key, value text)` for simple flags/config.
- Indexes: category/set/question+answer/next_review_date for query speed.

## Durable Objects
- Namespace binding: `SESSIONS`
- Class: `SessionsDO` (see `src/sessions-do.ts`)
- Responsibilities: start sessions, evaluate answers, update SRS fields, persist events, compute progress.

## Configuration (wrangler.toml)
- `main = "src/worker.ts"`
- `[assets]` → `directory = "../frontend/dist"`, `binding = "ASSETS"`
- `[[d1_databases]]` → `binding = "DB"`, `database_name = "flashcards"`, `database_id = "98e5c374-ba8d-4cce-8490-10a3414fba0a"`
- `[durable_objects]` → `bindings = [{ name = "SESSIONS", class_name = "SessionsDO" }]`
- `[[routes]]` → `pattern = "game.fasttakeoff.org/*"`, `zone_name = "fasttakeoff.org"`

## Troubleshooting
- 401 Unauthorized: set `API_TOKEN` or remove header; ensure `Authorization: Bearer <token>` matches env.
- 404 assets: build frontend first (`cd ../frontend && npm run build`).
- D1 errors: verify DB binding name (`DB`) and `database_id` in `wrangler.toml`.
- DO migration problems: ensure class name `SessionsDO` is listed under `[[migrations]]` and active.
- Logs: `npx wrangler tail` for live traces.

## Directory Structure
```
backend/
├── src/
│   ├── worker.ts        # Hono app + routes
│   ├── sessions-do.ts   # Durable Object implementation
│   ├── srs.ts           # SM-2 SRS logic
│   ├── types.ts         # Shared types
│   └── utils/
│       └── validateAnswer.ts
├── schema.sql           # D1 schema
├── seed-hsk1.sql        # Seed dataset (HSK1)
├── wrangler.toml        # Worker config
└── package.json
```

