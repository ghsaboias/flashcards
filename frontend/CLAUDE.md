# Frontend (Vite + React) — Development Guide

React 19 + TypeScript app built with Vite. Built assets are served by the Cloudflare Worker via Wrangler `[assets]` binding.

> **Main Documentation**: See `../CLAUDE.md` for complete project overview, efficient learning principles, and multi-domain architecture.

## Architecture Overview

Modern React app implementing efficient learning principles with multi-domain spaced repetition:

- **Multi-Domain Support**: Chinese (HSK), World Geography with independent progression
- **High-Intensity Learning**: 20+ exercises per 30 minutes with adaptive feedback
- **Smart Session Management**: Auto-start API with intelligent content selection
- **Performance Optimized**: Code splitting, lazy loading, bundle optimization (68KB gzipped)

## Quick Commands
```bash
cd frontend
bun install
bun run dev       # Start Vite dev server (default :5173)
bun run build     # Type-check + production build
bun run lint      # ESLint (keep 0 warnings)
bun run preview   # Preview built app locally
```

## Recommended Dev Flow
- Worker-driven: build frontend, then run the backend Worker which serves the dist assets.
  ```bash
  cd frontend && bun run build
  cd ../backend && bun run dev  # http://localhost:8787
  ```
- Vite dev (optional): if you prefer Vite HMR, set API base so calls hit the Worker.
  ```bash
  # frontend/.env.local
  VITE_API_BASE=http://localhost:8787/api
  ```
  Then run `bun run dev` in `frontend` and `bun run dev` in `backend`.

## Component Architecture

### Core Components
- **`App.tsx`**: Main application with domain selection and practice mode routing
- **`DomainSelector.tsx`**: Multi-domain selection dropdown (Chinese/Geography)
- **`HighIntensityMode.tsx`**: Streamlined practice interface with auto-start
- **`TraditionalModes.tsx`**: Classic practice modes (review all, SRS, difficulty-based)

### Practice Session Components
- **`PracticeSession.tsx`**: Main practice interface with adaptive timing and pinyin controls
- **`SessionComplete.tsx`**: Completion screen with performance analytics and knowledge gap focus
- **`KeyboardHandler.tsx`**: Global keyboard shortcuts (R for audio, Enter to submit)

### Data Visualization
- **`StatsOverview.tsx`**: Performance dashboard with domain-filtered analytics
- **`SrsTable.tsx`**: SRS schedule table with due card prioritization
- **`StatsTable.tsx`**: Per-card accuracy statistics with filtering
- **`UnifiedTable.tsx`**: Combined SRS/stats view

### Specialized Components
- **`DrawingCanvas.tsx`**: Character drawing for Chinese practice (289 lines)
- **`AudioControls.tsx`**: TTS audio playback for Chinese characters

### State Management
- **`SessionContext.tsx`**: Global session state provider (49 lines)
- **`useSessionManager.ts`**: Centralized session logic with auto-start integration (474 lines)
- **`useSessionContext.ts`**: Session state hook with performance tracking (125 lines)

### Utility Modules
- **`api-client.ts`**: REST client with domain-aware endpoints (167 lines)
- **`pinyin.ts`**: Lazy-loaded pinyin processing (21 lines)
- **`session-utils.ts`**: Session management utilities (270 lines)
- **`hsk-label-utils.ts`**: HSK set labeling and progressive unlock logic (154 lines)

## Performance Optimization

### Bundle Analysis
- **Main app**: 222KB (68KB gzipped) - Core React components and logic
- **Pinyin library**: 302KB (138KB gzipped) - Lazy loaded for Chinese characters
- **React vendor**: 11KB (4KB gzipped) - React runtime
- **Utils**: 35KB (14KB gzipped) - Utility functions and helpers
- **Build time**: <700ms with TypeScript compilation

### Optimization Strategies
- **Lazy Loading**: `pinyin-pro` only loads when Chinese text detected
- **Code Splitting**: Manual Vite chunks separate vendor/pinyin/utils
- **Component Lazy Loading**: High-intensity and advanced components load on-demand
- **API Optimization**: Domain filtering reduces payload sizes
- **Performance Analytics**: Real-time monitoring via `/api/performance` endpoint

### Bundle Configuration (`vite.config.ts`)
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        pinyin: ['pinyin-pro'],
        utils: ['axios', 'clsx']
      }
    }
  }
}
```

## Multi-Domain Features

### Domain Selection
- **DomainSelector Component**: Dropdown for Chinese/Geography domain switching
- **Independent Progress**: Each domain maintains separate SRS schedules and unlock criteria
- **Domain-Aware APIs**: All data endpoints filter by selected domain
- **Visual Indicators**: Domain-specific icons and styling

### Chinese Domain Features
- **Pinyin Support**: Toggle display with lazy-loaded `pinyin-pro` library
- **Audio TTS**: Text-to-speech for character pronunciation
- **Character Drawing**: Canvas component for stroke practice
- **HSK Progression**: Levels 1-30 with accuracy-based unlocks

### Geography Domain Features
- **Country/Capital Practice**: World geography flashcards
- **Visual Learning**: Flag and map integration support
- **Regional Filtering**: Continent-based content organization

## Session Management

### High-Intensity Mode
- **Auto-Start API**: Intelligent content selection via `/api/sessions/auto-start`
- **Adaptive Feedback**: 2-6 second timing based on difficulty and response speed
- **20-Question Cap**: Prevents overwhelming sessions
- **Priority Scoring**: SRS due (+100), struggling sets (+80), active learning (+60)

### Traditional Modes
- **Review All**: Complete set practice
- **SRS Review**: Spaced repetition based on due dates
- **Difficulty Practice**: Focus on struggling cards
- **Multi-Set**: Cross-set practice sessions

### Session Analytics
- **Response Time Tracking**: Millisecond precision performance data
- **Knowledge Gap Analysis**: Identifies struggling concepts on completion
- **Progress Visualization**: Real-time accuracy and timing feedback

## Recent Architecture Updates
- **Multi-Domain Support**: Added domain selection and filtering throughout
- **Session Management Refactor**: Extracted into hooks and contexts pattern
- **Component Modularity**: Separated concerns with specialized components
- **Performance Optimization**: Bundle splitting and lazy loading implementation
- **TypeScript Enhancement**: Comprehensive type definitions across modules

## Quality Standards
- **Zero TypeScript errors** on build (`bun run build`)
- **Zero ESLint warnings** (`bun run lint`)
- **Bundle optimization** with manual chunking and lazy loading
- **Performance monitoring** with build-time analysis
- **Code splitting** for optimal loading performance

## Development Best Practices
- **Component Organization**: Separate concerns with hooks, contexts, and utilities
- **Lazy Loading**: Prefer lazy imports for large dependencies (pinyin, advanced components)
- **Type Safety**: Comprehensive TypeScript definitions in `src/types/`
- **Performance First**: Monitor bundle sizes and loading performance
- **Domain Awareness**: All new features should support multi-domain architecture

## Troubleshooting

### Common Issues
- **Blank page/404 assets**: Run fresh `bun run build` before starting backend
- **API 401 during dev**: Backend may enforce Bearer token - remove header or match `API_TOKEN`
- **CORS errors on Vite dev**: Set `VITE_API_BASE=http://localhost:8787/api` in `.env.local`
- **Slow pinyin loading**: Ensure lazy import in `utils/pinyin.ts` - avoid eager imports
- **TypeScript errors**: Check type definitions in `src/types/` modules
- **Bundle warnings**: Review Vite config and manual chunks configuration

### Performance Debugging
- **Bundle analysis**: Use `bunx vite-bundle-analyzer` to inspect chunk sizes
- **Network timing**: Check browser DevTools for API response times
- **Lazy loading**: Verify components load on-demand in Network tab
- **Memory usage**: Monitor React DevTools for component re-renders

> **Backend Integration**: See `../backend/CLAUDE.md` for API endpoints, database schema, and Durable Objects architecture.
