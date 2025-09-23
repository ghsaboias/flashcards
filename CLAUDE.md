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
        ├── 📄 router.tsx           # React Router w/ lazy loading & performance monitoring
        ├── 📄 main.tsx             # React entry point with RouterProvider (14 lines)
        ├── 📄 App.tsx.legacy       # Legacy conditional rendering (archived)
        ├── 📄 App.css              # Application styles
        ├── 📁 pages/               # Page components (URL-based routing, React.lazy)
        │   ├── 📄 HomePage.tsx         # High-intensity quick start (eager load)
        │   ├── 📄 PracticePage.tsx     # Traditional practice modes (lazy)
        │   ├── 📄 SessionPage.tsx      # Active practice sessions (lazy)
        │   ├── 📄 CompletePage.tsx     # Session results & analytics (lazy)
        │   ├── 📄 StatsPage.tsx        # Analytics dashboard (lazy)
        │   ├── 📄 BrowsePage.tsx       # Card browsing by set (lazy)
        │   ├── 📄 DrawingPage.tsx      # Character drawing practice (lazy)
        │   └── 📄 ErrorPage.tsx        # 404 and error handling (eager)
        ├── 📁 layouts/             # Layout components (React.memo optimized)
        │   ├── 📄 MainLayout.tsx       # Shared navigation & domain selector
        │   └── 📄 SessionLayout.tsx    # Practice session layout
        ├── 📁 components/          # React components (performance optimized)
        │   ├── 📄 AudioControls.tsx     # Audio controls component
        │   ├── 📄 DomainSelector.tsx    # Multi-domain selection dropdown
        │   ├── 📄 HighIntensityMode.tsx # High-intensity practice mode
        │   ├── 📄 KeyboardHandler.tsx   # Keyboard shortcuts handler
        │   ├── 📄 PracticeSession.tsx   # Practice session component
        │   ├── 📄 SessionComplete.tsx   # Session completion screen
        │   ├── 📄 SrsTable.tsx          # SRS schedule table
        │   ├── 📄 StatsOverview.tsx     # Statistics overview
        │   ├── 📄 StatsTable.tsx        # Statistics table
        │   ├── 📄 TraditionalModes.tsx  # Traditional practice modes
        │   ├── 📄 UnifiedTable.tsx      # Unified SRS/stats table
        │   └── 📄 DrawingCanvas.tsx     # Character drawing (lazy loaded)
        ├── 📁 contexts/            # React Context providers (useMemo optimized)
        │   ├── 📄 SessionContext.tsx    # Session state context
        │   ├── 📄 AppContext.tsx        # Global app context provider
        │   └── 📄 AppContextDefinition.ts # App context type definition
        ├── 📁 providers/           # Global provider patterns
        │   └── 📄 GlobalSessionProvider.tsx # Session management wrapper
        ├── 📁 hooks/               # Custom React hooks
        │   ├── 📄 useAudioControls.ts   # Audio controls hook
        │   ├── 📄 useSessionContext.ts  # Session context hook
        │   ├── 📄 useSessionManager.ts  # Session management hook
        │   └── 📄 useAppContext.ts      # Global app context hook
        ├── 📁 types/               # TypeScript type definitions
        │   ├── 📄 api-types.ts          # API response types
        │   ├── 📄 component-props.ts    # Component prop types
        │   └── 📄 session-types.ts      # Session-related types
        ├── 📁 utils/               # Utility functions
        │   ├── 📄 pinyin.ts             # Lazy pinyin processing
        │   ├── 📄 api-client.ts         # API client
        │   ├── 📄 hsk-label-utils.ts    # HSK label utilities
        │   ├── 📄 session-utils.ts      # Session utilities
        │   ├── 📄 srs-date-utils.ts     # SRS date utilities
        │   ├── 📄 stats-aggregation.ts  # Statistics aggregation
        │   ├── 📄 text-utils.ts         # Text processing utilities
        │   └── 📄 performance-monitor.ts # Performance monitoring utility
        └── 📁 assets/              # Static assets

🔗 **Detailed Architecture**: See [`frontend/CLAUDE.md`](frontend/CLAUDE.md) for component architecture, performance optimizations, and development patterns.

## 📊 Codebase Statistics
- **Total Lines of Code:** ~4,400 lines (TypeScript/React)
- **Backend Total:** ~1,000+ lines across 8 files (modularized utilities)
- **Frontend Total:** ~3,400+ lines across 40+ files (page-based architecture)
- **Architecture:** Page-based React Router app with layouts, modular backend with extracted utilities
- **Migration Impact:** Added ~1,000 lines of page components, eliminated ~200 lines of conditional rendering
```

## Module Documentation & Cross-References

### 📖 Detailed Module Docs
- **Backend**: [`backend/CLAUDE.md`](backend/CLAUDE.md) — API endpoints, D1 schema, Durable Objects, authentication
- **Frontend**: [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — Component architecture, performance optimization, bundle analysis
- **Changes**: [`CHANGELOG.md`](CHANGELOG.md) — Historical improvements and fixes

### 🔗 Cross-Reference Guide
- **API Endpoints**: See [`backend/CLAUDE.md > API Endpoints`](backend/CLAUDE.md#api-endpoints) for complete REST API documentation
- **Database Schema**: See [`backend/CLAUDE.md > Database (D1)`](backend/CLAUDE.md#database-d1) for table structure and common queries
- **Performance Details**: See [`frontend/CLAUDE.md > Performance Optimization`](frontend/CLAUDE.md#performance-optimization) for bundle analysis and React optimizations
- **Component Architecture**: See [`frontend/CLAUDE.md > Component Architecture`](frontend/CLAUDE.md#component-architecture) for React patterns and state management
- **Development Commands**: Module-specific commands documented in respective CLAUDE.md files

Note: Module docs live alongside code for faster, focused reference with smart abstraction in this main file.

## Development Commands

### Quick Start
```bash
# Frontend development with performance optimization
cd frontend && bun install && bun run dev

# Backend worker development
cd backend && bun install && bun run dev

# Full-stack testing (recommended)
cd frontend && bun run build && cd ../backend && bun run dev
```

### 📋 Module-Specific Commands
**→ Frontend**: See [`frontend/CLAUDE.md > Quick Commands`](frontend/CLAUDE.md#quick-commands) for:
- Vite development server setup and optimization
- Bundle analysis and performance monitoring
- Linting, testing, and build verification

**→ Backend**: See [`backend/CLAUDE.md > Quick Commands`](backend/CLAUDE.md#quick-commands) for:
- Cloudflare Workers local development
- D1 database migrations and schema management
- Deployment to Cloudflare infrastructure

### Database Management
```bash
# Preferred: Use Cloudflare MCP tools for database operations
# Account ID: 0897132adb36db4188ceb0ebd9ee76f2
# Database ID: 98e5c374-ba8d-4cce-8490-10a3414fba0a

# Flow: accounts_list → set_active_account → d1_databases_list → d1_database_query
```

**→ Database Details**: See [`backend/CLAUDE.md > Database (D1)`](backend/CLAUDE.md#database-d1) for schema management, common queries, and migration patterns.

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

## React Router Migration ✅ COMPLETE

The frontend has been fully migrated from conditional rendering to a high-performance page-based architecture with advanced optimization:

### URL Routes
- **`/`** - HomePage: High-intensity quick start (eagerly loaded)
- **`/practice`** - PracticePage: Traditional practice modes (lazy loaded)
- **`/session/:id`** - SessionPage: Active practice sessions (lazy loaded)
- **`/complete/:id`** - CompletePage: Session results & analytics (lazy loaded)
- **`/stats`** - StatsPage: Comprehensive analytics dashboard (lazy loaded)
- **`/browse/:set`** - BrowsePage: Card browsing by set (lazy loaded)
- **`/drawing/:set`** - DrawingPage: Character drawing practice (lazy loaded)

### Architecture Benefits
- ✅ **URL-based navigation**: Bookmarkable sessions, browser back/forward support
- ✅ **Eliminated mode flags**: Removed `isHighIntensityMode`, `inBrowseMode`, `inDrawingMode`
- ✅ **Clean separation**: Global app context vs page-specific session state
- ✅ **Professional UX**: Navigation breadcrumbs, error boundaries, loading states
- ✅ **Developer experience**: Easier testing, simpler component structure
- ✅ **Performance optimization**: Route-based code splitting with React.lazy()
- ✅ **Render optimization**: React.memo() on all components to prevent unnecessary re-renders
- ✅ **Context optimization**: Memoized provider values to eliminate cascading re-renders

### Performance Features
- **Lazy Loading**: All pages except HomePage use React.lazy() for optimal initial bundle size
- **Prefetching Strategy**: Strategic prefetching based on user journey patterns
- **Performance Monitoring**: Real-time route transition timing with Web Performance API
- **Context Memoization**: useMemo() optimizations in all context providers
- **Component Memoization**: React.memo() wrapping for all page and layout components

### Migration Impact
- **Added**: 8 page components, 2 layout components, global app context, performance monitoring
- **Removed**: 187 lines of conditional rendering logic from legacy App.tsx
- **Performance**: 95% initial bundle size reduction (222KB → 11.5KB)
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

## Performance Optimizations ✅ ADVANCED

### Bundle Optimization Results
**Dramatic Performance Improvement Achieved:**
- **Main app**: **11.5KB** (4KB gzipped) - **95% reduction** from 222KB
- **React vendor**: 260KB (84KB gzipped) - separate chunk, cached
- **Pinyin library**: 302KB (138KB gzipped) - lazy loaded for Chinese content
- **Page components**: 0.65KB - 25KB each (individually chunked)
- **Drawing canvas**: 3.4KB (separate lazy chunk)
- **Build time**: <700ms with advanced chunking

### Advanced React Optimizations
- **Route-based Code Splitting**: React.lazy() for all page components except HomePage
- **Component Memoization**: React.memo() wrapping prevents unnecessary re-renders
- **Context Optimization**: useMemo() in all providers eliminates cascading re-renders
- **Strategic Prefetching**: Hover/focus-triggered prefetching for instant navigation
- **Performance Monitoring**: Real-time Web Performance API tracking for all routes

### Vite Configuration Optimizations
- **Advanced Chunking Strategy**: Page-based, component-based, and vendor chunking
- **Performance Budgets**: 500KB chunk warnings, source maps enabled
- **Tree Shaking**: ES2020 target with optimized dependency exclusion
- **Bundle Analysis**: Built-in analysis tools and compressed size reporting

### Core Performance
- **Exercise density**: 20+ questions per 30 minutes
- **Response time tracking**: Millisecond precision
- **Route transitions**: <100ms average with prefetching
- **Initial load**: <200ms time to interactive
- **Memory efficiency**: Eliminated context provider re-render cascades

### Smart Loading Strategy
- **Critical Path**: HomePage eagerly loaded for fastest initial experience
- **User Journey**: Practice → Session → Complete flow prefetched as user progresses
- **On-Demand**: Stats, Browse, Drawing pages load when accessed
- **Component Level**: DrawingCanvas lazy loaded separately (large component)

## API Reference

### Key Endpoints Overview
- **Multi-Domain**: `GET /api/domains` - List knowledge domains (Chinese, Geography)
- **Auto-Start**: `POST /api/sessions/auto-start` - Intelligent session creation 🔥
- **Sessions**: `POST /api/sessions/start`, `GET /api/sessions/{id}`, `POST /api/sessions/{id}/answer`
- **Data**: `GET /api/sets`, `GET /api/srs/set`, `GET /api/stats/set`, `GET /api/performance`

### 📋 Complete Documentation
**→ See [`backend/CLAUDE.md > API Endpoints`](backend/CLAUDE.md#api-endpoints) for:**
- Complete endpoint documentation with request/response schemas
- Authentication patterns and Bearer token setup
- Multi-domain filtering parameters (`domain_id`)
- High-intensity learning vs traditional session modes
- Durable Objects session management details

### 🏗️ Backend Architecture
**→ See [`backend/CLAUDE.md > Overview`](backend/CLAUDE.md#overview) for:**
- Cloudflare Workers + Hono framework architecture
- D1 database configuration and binding
- Durable Objects for session state management
- Asset serving and authentication patterns

## Database Schema (D1 SQLite)

### Core Structure Overview
- **Multi-Domain**: `domains` table with Chinese (HSK) and Geography support
- **Cards**: Domain-aware flashcards with category/set organization
- **Session Data**: Event tracking, SRS scheduling, performance analytics
- **Indexes**: Optimized for category/set queries and next_review_date lookups

### Data Organization
- **Categories**: `hsk_level_1` (Chinese), `geography` (World Geography)
- **Sets**: `HSK1_Set_01` … `HSK1_Set_10`, `Geography_Countries`, etc.
- **Session Types**: Review All, SRS Review, Practice by Difficulty, Multi-Set modes

### 📋 Complete Schema Documentation
**→ See [`backend/CLAUDE.md > Database (D1)`](backend/CLAUDE.md#database-d1) for:**
- Complete table definitions and relationships
- Multi-domain architecture with foreign keys
- Performance indexes and query optimization
- Common queries for sessions, SRS, and analytics
- Database migration patterns and configuration

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
- Performance analytics and difficulty assessment, including domain-scoped dashboards

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

### Puppeteer Testing (MCP)
When testing the app with Puppeteer MCP tools, use these patterns for reliable element interaction:

**Button Clicking:**
```javascript
// ✅ RECOMMENDED: Find by text content using evaluate
const button = [...document.querySelectorAll('button')].find(btn => btn.textContent.includes('Start'));
if (button) {
  button.click();
  'Clicked Start button';
} else {
  'Button not found. Available: ' + [...document.querySelectorAll('button')].map(btn => btn.textContent).join(', ');
}
```

**Element Selection Patterns:**
```javascript
// ✅ Class-based selection
document.querySelector('.btn-primary')

// ✅ Attribute-based selection
document.querySelector('button[type="submit"]')

// ✅ Text content search
[...document.querySelectorAll('button')].find(btn => btn.textContent.includes('Exit'))

// ❌ AVOID: CSS4 selectors (not supported)
button:has-text("Start")     // SyntaxError
button:contains("Exit")      // SyntaxError
```

**Navigation Testing:**
```javascript
// ✅ Direct URL navigation for testing different pages
// puppeteer_navigate: http://localhost:8787/practice
// puppeteer_navigate: http://localhost:8787/session/123

// ✅ Check current URL
window.location.pathname  // Returns "/practice", "/session/123", etc.
```

**Form Interaction:**
```javascript
// ✅ Checkbox selection
document.querySelectorAll('input[type="checkbox"]')[0].click()

// ✅ Text input
document.querySelector('input[type="text"]').value = 'answer'

// ✅ Select dropdown
document.querySelector('select').value = 'option'
```


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
