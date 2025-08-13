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
└── Recognition_Practice/  # HSK flashcard data (CSV files)
    ├── HSK_Level_1/       # 6 sets, 150 HSK1 words
    └── HSK_Level_2/       # Extended vocabulary
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

### Database Management
```bash
cd backend
npm run migrate     # Apply D1 database migrations
npm run seed:hsk1   # Seed HSK Level 1 data
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
- **Storage**: Durable Objects for session state
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

**Tables:**
- `cards` - Flashcard data (question, answer, metadata)
- `sessions` - Practice session tracking
- `srs_data` - Spaced repetition scheduling (SM-2 algorithm)
- `session_answers` - Individual answer records

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
1. Add CSV files to `Recognition_Practice/`
2. Update seed scripts in `backend/scripts/`
3. Run seed commands

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