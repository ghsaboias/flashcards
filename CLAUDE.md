# HSK Flashcards Web App - AI Development Guide

## Project Overview

A modern web-based spaced repetition system (SRS) for learning Chinese characters using HSK vocabulary. Built with React frontend and Cloudflare Workers backend.

**Live App**: https://game.fasttakeoff.org  
**Repository**: https://github.com/ghsaboias/flashcards  
**CLI Version**: https://github.com/ghsaboias/flashcards-cli  
**Branch**: `master`

## Architecture

```
flashcards/
├── frontend/               # Vite + React TypeScript app
│   ├── src/
│   │   ├── App.tsx        # Main application component
│   │   ├── api.ts         # Backend API client
│   │   ├── components/    # React components
│   │   │   ├── SrsTable.tsx    # SRS schedule display
│   │   │   └── StatsTable.tsx  # Statistics display
│   │   └── utils/
│   │       └── pinyin.ts  # Lazy-loaded pinyin processing
│   ├── public/
│   │   └── china-flag.svg # Custom Chinese flag favicon
│   └── package.json
├── backend/               # Cloudflare Worker (Hono framework)
│   ├── src/
│   │   ├── worker.ts      # Main Hono app with API routes
│   │   ├── sessions-do.ts # Durable Object for session management
│   │   ├── srs.ts         # Spaced repetition algorithm (SM-2)
│   │   ├── types.ts       # TypeScript definitions
│   │   └── utils/
│   │       └── validateAnswer.ts # Answer validation logic
│   ├── wrangler.toml      # Cloudflare Worker configuration
│   └── package.json
```

## Development Commands

### Frontend Development
```bash
cd frontend
npm install
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint (0 warnings/errors)
```

### Backend Development
```bash
cd backend  
npm install
npm run dev      # Start local worker development
npm run deploy   # Deploy to Cloudflare
```

### Database Management (Cloudflare MCP)
```bash
# Preferred: Use Cloudflare MCP tools for database operations
# Flow: accounts_list → set_active_account → d1_databases_list → d1_database_query
# Account ID: 0897132adb36db4188ceb0ebd9ee76f2
# Database ID: 98e5c374-ba8d-4cce-8490-10a3414fba0a

# Example queries via MCP:
# Sessions: SELECT * FROM sessions ORDER BY started_at DESC LIMIT 5
# Analytics: SELECT * FROM session_events WHERE session_id='SESSION_ID' ORDER BY position
# Cards: SELECT * FROM cards LIMIT 5
```

## Deployment (Cloudflare Workers)

**Build Configuration:**
- **Build Command**: `cd frontend && npm ci && npm run build && cd ../backend && npm ci`
- **Deploy Command**: `cd backend && npx wrangler deploy`
- **Branch**: `master`

The build process:
1. Installs frontend dependencies
2. Builds optimized React app with code splitting
3. Installs backend dependencies  
4. Deploys Cloudflare Worker (includes frontend assets)

## Key Technologies

- **Frontend**: React 19, TypeScript, Vite, Axios
- **Backend**: Hono, Cloudflare Workers, D1 Database
- **Storage**: D1 Database for all card data, Durable Objects for session state
- **Deployment**: Cloudflare Pages with Workers integration
- **Features**: SRS algorithm, Chinese pinyin support, audio TTS

## Code Quality Standards

- ✅ **Zero TypeScript errors**
- ✅ **Zero ESLint warnings** 
- ✅ **Zero build warnings**
- ✅ **Optimized bundle sizes** with lazy loading
- ✅ **Code splitting** for better performance

## Performance Optimizations

### Bundle Optimization
- **Main app**: 203KB (63KB gzipped)
- **Pinyin library**: 302KB (138KB gzipped) - lazy loaded
- **React vendor**: 11KB (4KB gzipped)
- **Utils**: 35KB (14KB gzipped)
- **Build time**: ~900ms

### Lazy Loading
- Pinyin processing only loads when Chinese characters are encountered
- Improves initial page load performance

## API Endpoints

**Cards & Sets:**
- `GET /api/sets` - List available flashcard sets
- `GET /api/sets/{id}/cards` - Get cards for specific set
- `GET /api/categories` - List HSK categories

**Sessions:**
- `POST /api/sessions/start` - Create new practice session
- `GET /api/sessions/{id}` - Get session state
- `POST /api/sessions/{id}/answer` - Submit answer

**SRS & Statistics:**
- `GET /api/srs/set?set_name=...` - Get SRS data for set
- `GET /api/stats/set?set_name=...` - Get performance stats

## Database Schema (D1 SQLite)

### Table Structures

#### `cards` - Master flashcard data with SRS tracking
```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY,
  category_key TEXT NOT NULL,         -- e.g., "hsk_level_1"
  set_key TEXT NOT NULL,              -- e.g., "Recognition_Practice/HSK_Level_1/HSK1_Set_01"
  question TEXT NOT NULL,             -- Chinese character/phrase
  answer TEXT NOT NULL,               -- English translation
  correct_count INTEGER DEFAULT 0,    -- Total correct answers
  incorrect_count INTEGER DEFAULT 0,  -- Total incorrect answers  
  reviewed_count INTEGER DEFAULT 0,   -- Total times reviewed
  easiness_factor REAL DEFAULT 2.5,   -- SRS difficulty (1.3-2.5+)
  interval_hours INTEGER DEFAULT 0,   -- Hours until next review
  repetitions INTEGER DEFAULT 0,      -- Number of successful reviews
  next_review_date TEXT DEFAULT '1970-01-01 00:00:00',
  created_at TEXT DEFAULT strftime('%Y-%m-%d %H:%M:%S','now'),
  updated_at TEXT DEFAULT strftime('%Y-%m-%d %H:%M:%S','now')
);
```

#### `sessions` - Practice session summaries
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                -- Unique session identifier
  practice_name TEXT,                 -- e.g., "Recognition_Practice/HSK_Level_1/HSK1_Set_07"
  session_type TEXT,                  -- e.g., "Review All", "SRS Review", "Practice Difficult"
  started_at TEXT NOT NULL,           -- Session start timestamp
  ended_at TEXT,                      -- Session end timestamp (NULL if incomplete)
  duration_seconds REAL,              -- Total session duration
  correct_count INTEGER,              -- Questions answered correctly
  total INTEGER                       -- Total questions attempted
);
```

#### `session_events` - Individual question/answer records
```sql
CREATE TABLE session_events (
  session_id TEXT NOT NULL,           -- References sessions.id
  position INTEGER NOT NULL,          -- Question order within session (0-based)
  card_id INTEGER,                    -- References cards.id
  category_key TEXT,                  -- Card category
  set_key TEXT,                       -- Card set
  question TEXT NOT NULL,             -- Chinese character/phrase
  user_answer TEXT,                   -- User's input answer
  correct_answer TEXT,                -- Expected correct answer
  correct INTEGER NOT NULL,           -- 1 = correct, 0 = incorrect
  duration_seconds REAL NOT NULL,     -- Time to answer this question
  created_at TEXT NOT NULL,           -- Answer timestamp
  PRIMARY KEY (session_id, position)
);
```

### Key Data Relationships
- **cards.id** ↔ **session_events.card_id**
- **sessions.id** ↔ **session_events.session_id** 
- **cards.question** ↔ **session_events.question** (for analytics)

### Common Query Patterns

**Find struggling characters (< 80% accuracy):**
```sql
SELECT question, correct_answer,
       COUNT(*) as attempts,
       ROUND(AVG(CAST(correct AS REAL)) * 100, 1) as accuracy
FROM session_events 
GROUP BY question, correct_answer
HAVING attempts >= 3 AND accuracy < 80
ORDER BY accuracy ASC;
```

**Get SRS data for cards:**
```sql
SELECT question, answer, easiness_factor, interval_hours, 
       next_review_date, repetitions
FROM cards 
WHERE next_review_date <= datetime('now')
ORDER BY next_review_date ASC;
```

**Session performance over time:**
```sql
SELECT DATE(started_at) as date,
       COUNT(*) as sessions,
       SUM(total) as questions,
       ROUND(AVG(CAST(correct_count AS REAL)/total * 100), 1) as accuracy
FROM sessions
WHERE ended_at IS NOT NULL
GROUP BY DATE(started_at)
ORDER BY date DESC;
```

### Data Categories & Sets
- **Categories**: Currently only `"hsk_level_1"`
- **Sets**: `"Recognition_Practice/HSK_Level_1/HSK1_Set_01"` through `HSK1_Set_10`
- **Session Types**: `"Review All"`, `"SRS Review"`, `"Practice Difficult"`, `"Review Incorrect"`, `"Multi-Set Practice by Difficulty"`, etc.

## Features

### Practice Modes
- **Start Practice** - Review all cards in set/category
- **Practice Difficult** - Focus on cards with <80% accuracy
- **Practice SRS** - Review cards due for spaced repetition
- **Start Review** - Browse all cards with answers visible

### Key Functionality
- **Answer Validation** - Supports multiple correct answers (`answer1; answer2`)
- **Audio Support** - Text-to-speech for Chinese characters
- **Statistics Tracking** - Performance metrics and progress monitoring
- **Keyboard Shortcuts** - Efficient navigation (R for repeat audio, 1-6 for quick actions)
- **Socratic Tutoring** - AI-powered character reinforcement using visual mnemonics and guided questions

### Socratic Tutoring Methodology
**Flow for character reinforcement:**
1. **Identify struggling characters** - Query database for low-accuracy characters (<80%)
2. **Ask 1-2 guiding questions** - "What do you see?" "What associations come to mind?"  
3. **User provides visual mnemonics** - Personal visual/memory associations
4. **AI reinforces connections** - Links user's mnemonics to character meaning/usage
5. **Create memorable bridges** - Connect visual imagery to semantic meaning

**Example:**
- Character: 比 (compare; than) - 25% accuracy
- User mnemonic: "Two T's, like antlers" 
- AI reinforcement: "Antlers show who's stronger - perfect for **comparing** who's bigger **than** others!"
- Result: Visual-semantic bridge strengthens recall

## Development Guidelines

### Adding New Features
1. Follow existing TypeScript patterns
2. Update both frontend and backend as needed
3. Run `npm run lint` and `npm run build` to ensure 0 errors
4. Test locally before deploying
5. Update this CLAUDE.md file if architecture changes

### Code Style
- Use descriptive variable names
- Prefer existing patterns and libraries
- Always run linting before commits
- Follow React Hook best practices
- Use lazy loading for large dependencies

### Testing Changes
```bash
# Frontend
cd frontend && npm run build && npm run lint

# Backend  
cd backend && npm run dev  # Test locally first
```

## Common Tasks

### Updating Dependencies
```bash
cd frontend && npm update
cd backend && npm update
```

### Database Migrations
1. Modify `backend/schema.sql`
2. Add migration to `wrangler.toml`
3. Run `npm run migrate`

### Adding New HSK Data
1. Use Cloudflare MCP tools to insert new cards directly
2. Example: `mcp__cloudflare-bindings__d1_database_query` with SQL: `INSERT INTO cards (question, answer, set_name) VALUES ('没', 'not', 'HSK1_Set_01')`
3. Cards are stored exclusively in D1 database

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `npm ci` in both directories
- Check for TypeScript errors: `npm run build`
- Verify linting: `npm run lint`

### Deployment Issues  
- Check Cloudflare Pages build logs
- Verify `wrangler.toml` configuration
- Ensure D1 database is properly configured

### Development Server Issues
- Frontend: Check port 5173 (Vite default)
- Backend: Check port 8787 (Wrangler default)
- CORS issues: Verify API endpoints

## Recent Optimizations (Latest Updates)

- ✅ **Bundle size optimization** with code splitting
- ✅ **Lazy loading** for pinyin-pro library  
- ✅ **Zero warnings/errors** in build process
- ✅ **Chinese flag favicon** and updated branding
- ✅ **Perfect TypeScript/ESLint compliance**

## Important Notes

- **Never** commit node_modules or dist directories
- **Always** test locally before pushing to main branch
- **Build process** is fully automated via Cloudflare Workers
- **Domain**: Custom domain configured at `game.fasttakeoff.org`
- **Branch**: Development happens on `master` branch  
- **CLI Version**: Separate repository at https://github.com/ghsaboias/flashcards-cli
- for testing: build the frontend, then serve the backend using npx wrangler dev (in the background). this will start a server in port 8787
- there is no need to serve the frontend, as npx wrangler dev already serves the built FE + the BE
- read client logs with puppeteer mcp