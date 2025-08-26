# HSK Flashcards Web App - AI Development Guide

## Project Overview

A modern web-based spaced repetition system (SRS) for learning Chinese characters using HSK vocabulary. Built with React frontend and Cloudflare Workers backend.

**Live App**: https://game.fasttakeoff.org  
**Repository**: https://github.com/ghsaboias/flashcards  
**CLI Version**: https://github.com/ghsaboias/flashcards-cli  
**Branch**: `master`

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

## Module Documentation
- Backend: `backend/CLAUDE.md` — Worker/API, D1, Durable Objects, routes
- Frontend: `frontend/CLAUDE.md` — Vite/React app, build/lint, performance notes
- Historical Changes: `CHANGELOG.md` — Dated improvements and fixes

Note: Module docs live alongside code for faster, focused reference.

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
