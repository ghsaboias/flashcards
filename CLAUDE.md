# HSK Flashcards Web App - AI Development Guide

## Project Overview

A modern multi-domain spaced repetition system (SRS) for learning Chinese characters, world geography, and any flashcard content. Built with React 19 frontend and Cloudflare Workers backend.

**Live App**: https://game.fasttakeoff.org  
**Repository**: https://github.com/ghsaboias/flashcards  
**CLI Version**: https://github.com/ghsaboias/flashcards-cli  
**Branch**: `master`

## Efficient Learning Principles ✅ IMPLEMENTED

These **efficient learning principles** have been fully implemented in the HSK Flashcards app:

### Core Learning Principles

**Active vs. Passive Learning**
- Most time should be spent doing exercises, not consuming information
- Information consumption should only serve to enable production/practice
- Avoid "spectator mentality" - watching videos or reading without practice

**Bite-sized Learning Cycles** 
- Break content into small, digestible chunks
- Follow each piece of information immediately with 2-3 exercises
- Keep feedback loops tight and frequent

**Breadth-First Approach**
- Build foundational layer completely before adding complexity
- Like laying bricks: complete each layer before building upward
- Avoid going deep on one topic while missing foundational elements

**Memory Anchoring**
- In wide/flat knowledge domains, establish "memory anchors" throughout the space
- Use spaced repetition on key primitives before connecting them
- Build chunks, then chunks of chunks, then chunks of chunks of chunks

### Practical Implementation

**For Hierarchical Domains (like Chinese Characters)**
- Use spaced repetition with explicit performance tracking
- Demand immediate practice after information exposure
- Avoid open-ended exploration that breaks systematic progression
- Track performance and adjust difficulty to stay at edge of ability

**Universal Tactics**
- Aim for high exercise density per session (20+ exercises per 30 minutes)
- Track mistakes/performance quantitatively
- Adjust difficulty to maintain cognitive challenge
- Use spaced repetition based on performance data

**Key Success Factors**
- Expert learning system design required
- Must detect when system drifts off-course
- Requires systematic approach over motivation-based learning
- Clear, measurable performance goals

### Implementation Status ✅ COMPLETE

**High-Intensity Learning System:**
- ✅ **Exercise Density**: 20+ questions per 30 minutes with streamlined interface
- ✅ **Adaptive Feedback**: 2-6 second timing based on difficulty and response speed
- ✅ **Progressive Unlocks**: 70-85% accuracy gates for systematic advancement
- ✅ **Knowledge Gap Focus**: Completion screen emphasizes struggling concepts
- ✅ **Memory Anchoring**: Immediate re-testing and spaced repetition integration

**Technical Implementation:**
- ✅ **Auto-Start API**: `/api/sessions/auto-start` with intelligent content selection
- ✅ **Adaptive Timing**: Backend calculates optimal feedback duration per question
- ✅ **Progressive System**: Unlock criteria enforced at database level
- ✅ **High-Intensity UI**: Minimal interface with full-screen question display
- ✅ **Performance Tracking**: Response time analytics and difficulty assessment

## Core Rules
- Never commit, push, or deploy unless explicitly requested
- Never create new files unless absolutely necessary
- For UI changes: make changes → ask user → optionally run local dev → wait for deploy request

## Task Management
- Use TodoWrite for multi-step tasks (3+ steps)
- Complete tasks immediately when finished
- Don't automatically add deployment or commit tasks

## Deployment Workflow
- UI changes: run local dev for user verification first
- Only proceed with commit/deploy when explicitly asked
- Order: commit → push → deploy (when requested)

## Commit Messages
- Keep commit messages clean and professional
- Never add Claude Code attribution or "Generated with Claude Code" messages
- Follow conventional commit format (feat:, fix:, perf:, etc.)

## Architecture

```
flashcards/
├── 📄 CHANGELOG.md                  # Historical changes and fixes
├── 📄 CLAUDE.md                     # Main project documentation
├── 📄 README.md                     # Project README
├── 📄 hsk30-expanded.csv           # HSK vocabulary data
├── 📄 session_log.txt              # Session logs
├── 📁 backend/                     # Cloudflare Worker + API
│   ├── 📄 CLAUDE.md                # Backend-specific docs
│   ├── 📄 package.json             # Node.js dependencies (updated: Hono 4.9.8, TS 5.9.2)
│   ├── 📄 bun.lock                 # Lockfile
│   ├── 📄 schema.sql               # D1 database schema
│   ├── 📄 seed-hsk1.sql            # HSK Level 1 data
│   ├── 📄 wrangler.toml            # Cloudflare Worker config
│   ├── 📄 tsconfig.json            # TypeScript config
│   ├── 📁 migrations/              # D1 database migrations
│   │   ├── 📄 0001_add_domains_table.sql     # Multi-domain support
│   │   ├── 📄 0002_add_domain_id_to_cards.sql # Domain foreign key
│   │   └── 📄 0003_add_geography_domain.sql   # Geography sample data
│   └── 📁 src/
│       ├── 📄 worker.ts            # Main Hono API routes (refactored)
│       ├── 📄 sessions-do.ts       # Durable Objects for sessions (refactored)
│       ├── 📄 srs.ts               # Spaced repetition algorithm (38 lines)
│       ├── 📄 types.ts             # TypeScript definitions (58 lines)
│       └── 📁 utils/               # Extracted utility functions
│           ├── 📄 validateAnswer.ts # Answer validation (13 lines)
│           ├── 📄 db-queries.ts    # Database query utilities (271 lines)
│           ├── 📄 stats-utils.ts   # Statistics computation (77 lines)
│           └── 📄 difficulty-utils.ts # Difficulty assessment (22 lines)
└── 📁 frontend/                    # React + Vite app
    ├── 📄 CLAUDE.md                # Frontend-specific docs
    ├── 📄 package.json             # Node.js dependencies
    ├── 📄 bun.lock                 # Lockfile
    ├── 📄 index.html               # Entry HTML
    ├── 📄 vite.config.ts           # Vite configuration (20 lines)
    ├── 📄 eslint.config.js         # ESLint rules (23 lines)
    ├── 📄 tsconfig.*.json          # TypeScript configs
    ├── 📁 public/
    │   ├── 🇨🇳 china-flag.svg       # Custom favicon
    │   └── 📄 vite.svg              # Default Vite logo
    └── 📁 src/
        ├── 📄 router.tsx           # React Router configuration with 7 routes
        ├── 📄 main.tsx             # React entry point with RouterProvider (14 lines)
        ├── 📄 App.tsx.legacy       # Legacy conditional rendering (archived)
        ├── 📄 App.css              # Application styles
        ├── 📁 pages/               # Page components (URL-based routing)
        │   ├── 📄 HomePage.tsx         # High-intensity quick start (41 lines)
        │   ├── 📄 PracticePage.tsx     # Traditional practice modes (191 lines)
        │   ├── 📄 SessionPage.tsx      # Active practice sessions (69 lines)
        │   ├── 📄 CompletePage.tsx     # Session results & analytics (168 lines)
        │   ├── 📄 StatsPage.tsx        # Analytics dashboard (137 lines)
        │   ├── 📄 BrowsePage.tsx       # Card browsing by set (154 lines)
        │   ├── 📄 DrawingPage.tsx      # Character drawing practice (159 lines)
        │   └── 📄 ErrorPage.tsx        # 404 and error handling (24 lines)
        ├── 📁 layouts/             # Layout components
        │   ├── 📄 MainLayout.tsx       # Shared navigation & domain selector (98 lines)
        │   └── 📄 SessionLayout.tsx    # Practice session layout (44 lines)
        ├── 📁 components/          # React components (extracted from pages)
        │   ├── 📄 AudioControls.tsx     # Audio controls component
        │   ├── 📄 DomainSelector.tsx    # Multi-domain selection dropdown
        │   ├── 📄 HighIntensityMode.tsx # High-intensity practice mode
        │   ├── 📄 KeyboardHandler.tsx   # Keyboard shortcuts handler
        │   ├── 📄 PracticeSession.tsx   # Practice session component
        │   ├── 📄 SessionComplete.tsx   # Session completion screen
        │   ├── 📄 SrsTable.tsx          # SRS schedule table (updated)
        │   ├── 📄 StatsOverview.tsx     # Statistics overview
        │   ├── 📄 StatsTable.tsx        # Statistics table (updated)
        │   ├── 📄 TraditionalModes.tsx  # Traditional practice modes
        │   ├── 📄 UnifiedTable.tsx      # Unified SRS/stats table (updated)
        │   └── 📄 DrawingCanvas.tsx     # Character drawing (289 lines)
        ├── 📁 contexts/            # React Context providers
        │   ├── 📄 SessionContext.tsx    # Session state context (49 lines)
        │   ├── 📄 AppContext.tsx        # Global app context provider (32 lines)
        │   └── 📄 AppContextDefinition.ts # App context type definition (9 lines)
        ├── 📁 hooks/               # Custom React hooks
        │   ├── 📄 useAudioControls.ts   # Audio controls hook
        │   ├── 📄 useSessionContext.ts  # Session context hook (125 lines)
        │   ├── 📄 useSessionManager.ts  # Session management hook (474 lines)
        │   └── 📄 useAppContext.ts      # Global app context hook (9 lines)
        ├── 📁 types/               # TypeScript type definitions
        │   ├── 📄 api-types.ts          # API response types (146 lines)
        │   ├── 📄 component-props.ts    # Component prop types (107 lines)
        │   └── 📄 session-types.ts      # Session-related types (184 lines)
        ├── 📁 utils/               # Utility functions
        │   ├── 📄 pinyin.ts             # Lazy pinyin processing (21 lines)
        │   ├── 📄 api-client.ts         # API client (replaces api.ts, 167 lines)
        │   ├── 📄 hsk-label-utils.ts    # HSK label utilities (154 lines)
        │   ├── 📄 session-utils.ts      # Session utilities (270 lines)
        │   ├── 📄 srs-date-utils.ts     # SRS date utilities (122 lines)
        │   ├── 📄 stats-aggregation.ts  # Statistics aggregation (122 lines)
        │   └── 📄 text-utils.ts         # Text processing utilities (116 lines)
        └── 📁 assets/              # Static assets

## 📊 Codebase Statistics
- **Total Lines of Code:** ~4,400 lines (TypeScript/React)
- **Backend Total:** ~1,000+ lines across 8 files (modularized utilities)
- **Frontend Total:** ~3,400+ lines across 40+ files (page-based architecture)
- **Architecture:** Page-based React Router app with layouts, modular backend with extracted utilities
- **Migration Impact:** Added ~1,000 lines of page components, eliminated ~200 lines of conditional rendering
```

## Module Documentation
- Backend: `backend/CLAUDE.md` — Worker/API, D1, Durable Objects, routes
- Frontend: `frontend/CLAUDE.md` — Vite/React app, build/lint, performance notes
- Historical Changes: `CHANGELOG.md` — Dated improvements and fixes

Note: Module docs live alongside code for faster, focused reference.

## Development Commands

### Frontend Development
```bash
cd frontend
bun install
bun run dev      # Start development server
bun run build    # Build for production
bun run lint     # Run ESLint (0 warnings/errors)
```

### Backend Development
```bash
cd backend  
bun install
bun run dev      # Start local worker development
bun run deploy   # Deploy to Cloudflare
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
- **Build Command**: `cd frontend && bun install && bun run build && cd ../backend && bun install`
- **Deploy Command**: `cd backend && bunx wrangler deploy`
- **Branch**: `master`

The build process:
1. Installs frontend dependencies
2. Builds optimized React app with code splitting
3. Installs backend dependencies  
4. Deploys Cloudflare Worker (includes frontend assets)

## Key Technologies

- **Frontend**: React 19, TypeScript, Vite, React Router, Axios with lazy-loaded components
- **Backend**: Hono, Cloudflare Workers, D1 Database, Durable Objects
- **Storage**: D1 Database with progressive unlock logic, Durable Objects for session state
- **Deployment**: Cloudflare Pages with Workers integration
- **Features**: Adaptive SRS algorithm, progressive unlocks, Chinese pinyin support, audio TTS

## React Router Migration (ONGOING)

The frontend has been migrated from conditional rendering to a proper page-based architecture:

### URL Routes
- **`/`** - HomePage: High-intensity quick start
- **`/practice`** - PracticePage: Traditional practice modes
- **`/session/:id`** - SessionPage: Active practice sessions
- **`/complete/:id`** - CompletePage: Session results & analytics
- **`/stats`** - StatsPage: Comprehensive analytics dashboard
- **`/browse/:set`** - BrowsePage: Card browsing by set
- **`/drawing/:set`** - DrawingPage: Character drawing practice

### Architecture Benefits
- ✅ **URL-based navigation**: Bookmarkable sessions, browser back/forward support
- ✅ **Eliminated mode flags**: Removed `isHighIntensityMode`, `inBrowseMode`, `inDrawingMode`
- ✅ **Clean separation**: Global app context vs page-specific session state
- ✅ **Professional UX**: Navigation breadcrumbs, error boundaries, loading states
- ✅ **Developer experience**: Easier testing, simpler component structure

### Migration Impact
- **Added**: 8 page components, 2 layout components, global app context
- **Removed**: 187 lines of conditional rendering logic from legacy App.tsx
- **Maintained**: Full backward compatibility with existing backend API

## New API Endpoints

### **Multi-Domain Support**
- `GET /api/domains` - List available knowledge domains
  - Response: `[{ id: string, name: string, icon: string, has_audio: boolean }]`
  - Domains: Chinese (HSK), World Geography, and extensible for more

### **Domain-Aware Data Endpoints**
- `GET /api/sets?domain_id=<domain>` - List sets filtered by domain
  - Response: `[string]` - Array of set names for the specified domain
- `GET /api/categories?domain_id=<domain>` - List categories filtered by domain
  - Response: `[string]` - Array of category names for the specified domain
- `GET /api/stats/set?set_name=<set>&domain_id=<domain>` - Domain-filtered stats
- `GET /api/srs/set?set_name=<set>&domain_id=<domain>` - Domain-filtered SRS data
- All stats and SRS endpoints support optional `domain_id` parameter for filtering

### **High-Intensity Learning**
- `POST /api/sessions/auto-start` - Intelligent session creation with content auto-detection
  - Body: `{ user_level: 'beginner'|'intermediate'|'advanced', focus_mode: 'review'|'challenge', domain_id?: string }`
  - Response: Session with optimal card selection and batch loading
  - Domain filtering: Only shows cards from selected domain

### **Adaptive Feedback**
- `POST /api/sessions/:id/answer` - Enhanced with timing analytics
  - Body: `{ answer: string, response_time_ms: number }`
  - Response: Includes `feedback_duration_ms` and difficulty assessment

### **Progressive Unlock System**
- Unlock criteria enforced server-side based on accuracy and attempt thresholds
- Auto-start respects unlock status and selects appropriate content automatically
- Domain-aware: Each domain has independent progression

## Code Quality Standards

- ✅ **Zero TypeScript errors**
- ✅ **Zero ESLint warnings** 
- ✅ **Zero build warnings**
- ✅ **Optimized bundle sizes** with lazy loading
- ✅ **Code splitting** for better performance

## Performance Optimizations

### Bundle Optimization
- Main app: 222KB (68KB gzipped)
- Pinyin library: 302KB (138KB gzipped) - lazy loaded
- React vendor: 11KB (4KB gzipped)
- Utils: 35KB (14KB gzipped)
- Build time: <700ms

### Core Performance
- Exercise density: 20+ questions per 30 minutes
- Response time tracking: Millisecond precision
- Pre-loading logic for seamless navigation
- Minimal UI overhead in practice mode

### Code Splitting
- Pinyin processing: lazy loaded when Chinese characters detected
- High-intensity components: on-demand loading
- Advanced UI: lazy loaded

## API Reference

**Core Endpoints:**
- `GET /api/domains` - List available knowledge domains
- `GET /api/sets` - List available flashcard sets
- `POST /api/sessions/start` - Create new practice session
- `POST /api/sessions/auto-start` - Intelligent session with auto-content selection
- `GET /api/sessions/{id}` - Get session state
- `POST /api/sessions/{id}/answer` - Submit answer
- `GET /api/srs/set?set_name=...` - Get SRS data for set
- `GET /api/stats/set?set_name=...` - Get performance stats
- `GET /api/performance` - Daily performance summary

Complete API documentation: `backend/CLAUDE.md`

## Database Schema (D1 SQLite)

See `backend/CLAUDE.md` for the authoritative schema, indexes, and common queries.

### Data Categories & Sets
- Categories: currently `hsk_level_1`
- Sets: `Recognition_Practice/HSK_Level_1/HSK1_Set_01` … `HSK1_Set_10`
- Session Types: Review All, SRS Review, Practice by Difficulty, Review Incorrect, Multi-Set modes

## Features

### Multi-Domain Learning
- Domain selection: Chinese (HSK), World Geography
- Independent progress tracking per domain
- Extensible architecture for additional domains

### Practice Modes
- **High-Intensity**: Auto-start with intelligent content selection
- **Traditional**: Review all, practice difficult, SRS review, browse mode

### Core Functionality
- Adaptive feedback timing (2-6 seconds based on difficulty/speed)
- Progressive unlocks (70-85% accuracy gates)
- Response time tracking (millisecond precision)
- Audio support for Chinese characters
- Keyboard shortcuts (R for audio, Enter to submit)
- Performance analytics and difficulty assessment

### Socratic Tutoring
Character reinforcement flow:
1. Identify low-accuracy characters (<80%)
2. Prompt for visual associations
3. Reinforce semantic connections
4. Create memorable bridges between imagery and meaning

### Session Management
- **20-question cap**: Prevents overwhelming sessions
- **Context switching limit**: Maximum 2 sets per session
- **Priority scoring algorithm**:
  * +100 points for SRS due cards (memory maintenance)
  * +80 points for struggling sets (<80% accuracy)
  * +60 points for active learning sets (80-90% accuracy)
  * -50 points for mastered sets (>90% accuracy, skipped)

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
cd frontend && bun run build && bun run lint

# Backend  
cd backend && bun run dev  # Test locally first
```

## Common Tasks

### Updating Dependencies
```bash
cd frontend && bun update
cd backend && bun update
```

### Database Migrations
1. Modify `backend/schema.sql`
2. Add migration to `wrangler.toml`
3. Run `bun run migrate`

### Adding New HSK Data
1. Use Cloudflare MCP tools to insert new cards directly
2. Example: `mcp__cloudflare-bindings__d1_database_query` with SQL: `INSERT INTO cards (question, answer, set_name) VALUES ('没', 'not', 'HSK1_Set_01')`
3. Cards are stored exclusively in D1 database

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `bun install` in both directories
- Check for TypeScript errors: `bun run build`
- Verify linting: `bun run lint`

### Deployment Issues  
- Check Cloudflare Pages build logs
- Verify `wrangler.toml` configuration
- Ensure D1 database is properly configured

### Development Server Issues
- Frontend: Check port 5173 (Vite default)
- Backend: Check port 8787 (Wrangler default)
- CORS issues: Verify API endpoints


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
