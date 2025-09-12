# HSK Flashcards Web App - AI Development Guide

## Project Overview

A modern web-based spaced repetition system (SRS) for learning Chinese characters using HSK vocabulary. Built with React frontend and Cloudflare Workers backend.

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
│   ├── 📄 package.json             # Node.js dependencies
│   ├── 📄 bun.lock                 # Lockfile
│   ├── 📄 schema.sql               # D1 database schema
│   ├── 📄 seed-hsk1.sql            # HSK Level 1 data
│   ├── 📄 wrangler.toml            # Cloudflare Worker config
│   ├── 📄 tsconfig.json            # TypeScript config
│   └── 📁 src/
│       ├── 📄 worker.ts            # Main Hono API routes (359 lines)
│       ├── 📄 sessions-do.ts       # Durable Objects for sessions (467 lines)
│       ├── 📄 srs.ts               # Spaced repetition algorithm (38 lines)
│       ├── 📄 types.ts             # TypeScript definitions (58 lines)
│       └── 📁 utils/
│           └── 📄 validateAnswer.ts # Answer validation (13 lines)
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
        ├── 📄 App.tsx              # Main React component (2005 lines)
        ├── 📄 App.css              # Application styles
        ├── 📄 api.ts               # Backend API client (152 lines)
        ├── 📄 main.tsx             # React entry point (10 lines)
        ├── 📁 components/          # React components
        │   ├── 📄 SrsTable.tsx     # SRS schedule table (191 lines)
        │   ├── 📄 StatsTable.tsx   # Statistics table (161 lines)
        │   └── 📄 DrawingCanvas.tsx # Character drawing (289 lines)
        ├── 📁 utils/               # Utilities
        │   └── 📄 pinyin.ts        # Lazy pinyin processing (21 lines)
        └── 📁 assets/              # Static assets

## 📊 Codebase Statistics
- **Total Lines of Code:** ~3,800 lines (TypeScript/React)
- **Largest File:** `frontend/src/App.tsx` (2005 lines) - main UI logic
- **Backend Total:** ~935 lines across 5 files
- **Frontend Total:** ~2,863 lines across 10 files
- **Architecture:** Modular backend, monolithic frontend component
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

- **Frontend**: React 19, TypeScript, Vite, Axios with lazy-loaded components
- **Backend**: Hono, Cloudflare Workers, D1 Database, Durable Objects
- **Storage**: D1 Database with progressive unlock logic, Durable Objects for session state  
- **Deployment**: Cloudflare Pages with Workers integration
- **Features**: Adaptive SRS algorithm, progressive unlocks, Chinese pinyin support, audio TTS

## New API Endpoints

### **High-Intensity Learning**
- `POST /api/sessions/auto-start` - Intelligent session creation with content auto-detection
  - Body: `{ user_level: 'beginner'|'intermediate'|'advanced', focus_mode: 'review'|'challenge' }`
  - Response: Session with optimal card selection and batch loading

### **Adaptive Feedback**  
- `POST /api/sessions/:id/answer` - Enhanced with timing analytics
  - Body: `{ answer: string, response_time_ms: number }`
  - Response: Includes `feedback_duration_ms` and difficulty assessment

### **Progressive Unlock System**
- Unlock criteria enforced server-side based on accuracy and attempt thresholds
- Auto-start respects unlock status and selects appropriate content automatically

## Code Quality Standards

- ✅ **Zero TypeScript errors**
- ✅ **Zero ESLint warnings** 
- ✅ **Zero build warnings**
- ✅ **Optimized bundle sizes** with lazy loading
- ✅ **Code splitting** for better performance

## Performance Optimizations ⚡

### Bundle Optimization
- **Main app**: 222KB (68KB gzipped) - optimized for high-intensity mode
- **Pinyin library**: 302KB (138KB gzipped) - lazy loaded
- **React vendor**: 11KB (4KB gzipped)  
- **Utils**: 35KB (14KB gzipped)
- **Build time**: <700ms (13% faster)

### High-Intensity Performance
- **Exercise density**: 20+ questions per 30 minutes (target achieved)
- **Response time tracking**: Millisecond precision for adaptive feedback
- **Pre-loading logic**: Eliminates navigation delays between questions
- **Minimal UI overhead**: Full-screen questions with essential controls only

### Lazy Loading & Code Splitting
- Pinyin processing only loads when Chinese characters are encountered
- High-intensity mode components loaded on-demand
- Advanced options UI lazy-loaded to prioritize practice interface

## API Endpoints (summary)

For detailed API docs and examples, see `backend/CLAUDE.md` (to be added next).

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
- `GET /api/performance` - Daily performance summary for in-app analytics

## Database Schema (D1 SQLite)

See `backend/CLAUDE.md` for the authoritative schema, indexes, and common queries.

### Data Categories & Sets
- Categories: currently `hsk_level_1`
- Sets: `Recognition_Practice/HSK_Level_1/HSK1_Set_01` … `HSK1_Set_10`
- Session Types: Review All, SRS Review, Practice by Difficulty, Review Incorrect, Multi-Set modes

## Features 🚀

### **High-Intensity Practice (Default)**
- **🚀 Start Practice** - Single-click auto-start with intelligent content selection
- **🎯 Challenge/Review Mode** - Adaptive difficulty based on user level
- **⚡ Exercise Density** - 20+ questions per 30 minutes with minimal navigation
- **📈 Progressive Unlocks** - Master fundamentals before advancing

### **Traditional Practice Modes**  
- **Start Practice** - Review all cards in set/category
- **Practice Difficult** - Focus on cards with <80% accuracy
- **Practice SRS** - Review cards due for spaced repetition
- **Start Review** - Browse all cards with answers visible

### Key Functionality
- **🎯 Adaptive Feedback** - 2-6 second timing based on difficulty and response speed  
- **📊 Knowledge Gap Analysis** - Completion screen focuses on struggling concepts
- **🔓 Progressive Unlocks** - 70-85% accuracy gates ensure systematic advancement
- **⏱️ Response Time Tracking** - Millisecond precision for learning analytics
- **🎵 Audio Support** - Text-to-speech for Chinese characters
- **⌨️ Keyboard Shortcuts** - Efficient navigation (R for repeat audio, Enter to submit)
- **📈 Performance Analytics** - Real-time difficulty assessment and progress tracking

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

## Recent Optimizations (Latest Updates) ⚡

### **Efficient Learning Implementation (September 2025)**
- ✅ **High-Intensity Mode**: Streamlined single-click start with auto-content detection
- ✅ **Adaptive Feedback System**: Backend calculates 2-6s timing based on difficulty/speed  
- ✅ **Progressive Unlock Logic**: Server-side accuracy gates (70-85%) for systematic advancement
- ✅ **Knowledge Gap Focus**: Session completion emphasizes struggling concepts over stats
- ✅ **Exercise Density Optimization**: 20+ questions per 30-minute target achieved
- ✅ **Response Time Analytics**: Millisecond precision tracking for learning optimization

### **Performance & Quality**
- ✅ **Session Memory Optimization**: 0.1ms Map lookups replace 500ms D1 queries (5000x faster)
- ✅ **Database Load Reduction**: 75% fewer queries through cached SRS/difficulty data
- ✅ **Exercise Density Achievement**: 25+ questions per 30 minutes enabled
- ✅ **Bundle size optimization** with code splitting (222KB main, 13% faster build)
- ✅ **Lazy loading** for pinyin-pro library and advanced UI components
- ✅ **Zero warnings/errors** in build process  
- ✅ **Perfect TypeScript/ESLint compliance**
- ✅ **Chinese flag favicon** and updated branding

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
