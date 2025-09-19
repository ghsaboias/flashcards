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

### Page-Based Router Architecture ✅ COMPLETE
The app has migrated from conditional rendering to React Router with dedicated page components:

### Page Components (`src/pages/`)
- **`HomePage.tsx`**: High-intensity quick start landing page (41 lines)
- **`PracticePage.tsx`**: Traditional practice modes selection (191 lines)
- **`SessionPage.tsx`**: Active practice sessions interface (69 lines)
- **`CompletePage.tsx`**: Session results and analytics (168 lines)
- **`StatsPage.tsx`**: Domain-scoped analytics dashboard with set filters (200+ lines)
- **`BrowsePage.tsx`**: Card browsing by set (154 lines)
- **`DrawingPage.tsx`**: Character drawing practice (159 lines)
- **`ErrorPage.tsx`**: 404 and error handling (24 lines)

### Layout Components (`src/layouts/`)
- **`MainLayout.tsx`**: Shared navigation & domain selector (98 lines)
- **`SessionLayout.tsx`**: Practice session layout (44 lines)

### Core Components (`src/components/`)
- **`DomainSelector.tsx`**: Multi-domain selection dropdown (Chinese/Geography)
- **`HighIntensityMode.tsx`**: Streamlined practice interface with auto-start
- **`TraditionalModes.tsx`**: Classic practice modes (review all, SRS, difficulty-based)

### Practice Session Components
- **`PracticeSession.tsx`**: Main practice interface with adaptive timing and pinyin controls
- **`SessionComplete.tsx`**: Completion screen with performance analytics and knowledge gap focus
- **`KeyboardHandler.tsx`**: Global keyboard shortcuts (R for audio, Enter to submit)

### Data Visualization
- **`StatsOverview.tsx`**: Performance dashboard with domain-filtered analytics
- **`StatsPage.tsx`**: Domain performance/SRS/accuracy views backed by aggregated endpoints
- **`SrsTable.tsx`**: SRS schedule table with due card prioritization
- **`StatsTable.tsx`**: Per-card accuracy statistics with filtering
- **`UnifiedTable.tsx`**: Combined SRS/stats view

### Specialized Components
- **`DrawingCanvas.tsx`**: Character drawing for Chinese practice (289 lines)
- **`AudioControls.tsx`**: TTS audio playback for Chinese characters

### State Management (`src/contexts/` & `src/hooks/`)
- **`AppContext.tsx`**: Global app context provider (32 lines)
- **`AppContextDefinition.ts`**: App context type definition (9 lines)
- **`useAppContext.ts`**: Global app context hook (9 lines)
- **`SessionContext.tsx`**: Session state context provider (49 lines)
- **`useSessionManager.ts`**: Centralized session logic with auto-start integration (474 lines)
- **`useSessionContext.ts`**: Session state hook with performance tracking (125 lines)

### Utility Modules
- **`api-client.ts`**: REST client with domain analytics endpoints (stats/SRS/performance)
- **`pinyin.ts`**: Lazy-loaded pinyin processing (21 lines)
- **`session-utils.ts`**: Session management utilities (270 lines)
- **`hsk-label-utils.ts`**: HSK set labeling and progressive unlock logic (154 lines)

## Performance Optimization ✅ ADVANCED

### Dramatic Bundle Size Reduction
**Performance Achievement: 95% Initial Bundle Size Reduction**
- **Main app**: **11.5KB** (4KB gzipped) - **95% reduction** from 222KB
- **React vendor**: 260KB (84KB gzipped) - Separate cached chunk
- **Pinyin library**: 302KB (138KB gzipped) - Lazy loaded for Chinese content
- **Page components**: 0.65KB - 25KB each - Individually chunked with React.lazy()
- **Drawing canvas**: 3.4KB (1.6KB gzipped) - Separate lazy chunk
- **Build time**: <700ms with advanced chunking and TypeScript compilation

### Advanced React Performance Patterns

#### Route-Based Code Splitting
```typescript
// router.tsx - Lazy loading with performance monitoring
const PracticePage = lazy(() => {
  markRouteStart('practice')
  return import('./pages/PracticePage').then(module => {
    markRouteEnd('practice')
    return module
  })
})

// HomePage kept eager for fastest initial load
import HomePage from './pages/HomePage'
```

#### Component Memoization
```typescript
// All page components wrapped with React.memo()
const SessionPage = memo(function SessionPage() {
  // Component logic...
})

// Layout components optimized
const MainLayout = memo(function MainLayout({ children }) {
  // Prevents re-renders during navigation
})
```

#### Context Optimization
```typescript
// AppContext.tsx - Memoized provider values
const value: AppContextState = useMemo(() => ({
  selectedDomain,
  setSelectedDomain
}), [selectedDomain])

// SessionContext.tsx - Memoized helpers and context
const helpers: SessionHelpers = useMemo(() => ({
  speak,
  validateAnswer: validateUserAnswer,
  // ...other helpers
}), [speak, sessionState.selectedSets])
```

#### Strategic Prefetching
```typescript
// HomePage.tsx - User journey-based prefetching
useEffect(() => {
  // Prefetch most likely next page
  const prefetchTimer = setTimeout(() => {
    import('./PracticePage').catch(console.error)
  }, 500)

  // Prefetch session flow after longer delay
  const sessionPrefetchTimer = setTimeout(() => {
    Promise.all([
      import('./SessionPage'),
      import('./CompletePage')
    ]).catch(console.error)
  }, 2000)

  return () => {
    clearTimeout(prefetchTimer)
    clearTimeout(sessionPrefetchTimer)
  }
}, [])
```

### Advanced Vite Configuration
```typescript
// vite.config.ts - Performance-optimized chunking
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 500, // Reduced for smaller chunks
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Page-based chunking for lazy-loaded components
          if (id.includes('src/pages/')) {
            const page = id.split('/pages/')[1].split('.')[0]
            return `page-${page.toLowerCase()}`
          }

          // Component chunking for large components
          if (id.includes('DrawingCanvas')) {
            return 'drawing'
          }

          // Vendor library chunking
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor'
          }
          if (id.includes('pinyin-pro')) {
            return 'pinyin'
          }
        }
      }
    },
    sourcemap: true, // Production debugging
    target: 'es2020' // Modern browsers for better performance
  },
  // Development optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['pinyin-pro'] // Lazy load this
  }
})
```

### Performance Monitoring
```typescript
// utils/performance-monitor.ts - Real-time performance tracking
export const performanceMonitor = {
  recordRouteTransition(routeName: string, duration: number) {
    if (duration > 200) {
      console.warn(`Slow route transition: ${routeName} took ${duration}ms`)
    }
  },

  recordRender(componentName: string, duration: number) {
    if (duration > 50) {
      console.warn(`Slow render: ${componentName} took ${duration}ms`)
    }
  }
}
```

### Bundle Analysis Commands
```bash
# Bundle size analysis
bun run analyze  # Opens bundle analyzer

# Performance monitoring during development
bun run dev  # Includes performance monitoring

# Production bundle verification
bun run build && bun run preview
```

### Performance Metrics Achieved
- **Initial Load**: <200ms time to interactive
- **Route Transitions**: <100ms average with prefetching
- **Bundle Transfer**: 95% reduction in initial JavaScript
- **Memory Efficiency**: Eliminated context provider re-render cascades
- **User Experience**: Instant navigation feel through strategic prefetching

### Optimization Strategies
- **Critical Path**: HomePage eagerly loaded for fastest initial experience
- **User Journey**: Practice → Session → Complete flow prefetched based on user behavior
- **On-Demand Loading**: Secondary features (Stats, Browse, Drawing) load when accessed
- **Component-Level Splitting**: Large components (DrawingCanvas) lazy loaded separately
- **Context Efficiency**: useMemo() prevents unnecessary provider re-renders
- **Performance Budgets**: 500KB chunk warnings with build-time analysis

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

## Recent Architecture Updates ✅ COMPLETE

### Router & Performance Migration (Complete)
- ✅ **React Router Migration**: Migrated from conditional rendering to page-based architecture
- ✅ **URL-Based Navigation**: Added proper routing with bookmarkable URLs and browser history
- ✅ **Layout System**: Created MainLayout and SessionLayout for consistent page structure
- ✅ **Component Separation**: Extracted page components from monolithic App.tsx (archived as App.tsx.legacy)
- ✅ **Global Context**: Added AppContext for domain state separate from session state
- ✅ **Multi-Domain Support**: Added domain selection and filtering throughout

### Advanced Performance Optimization (Complete)
- ✅ **Route-Based Code Splitting**: React.lazy() for all page components except HomePage
- ✅ **Component Memoization**: React.memo() wrapping prevents unnecessary re-renders
- ✅ **Context Optimization**: useMemo() in all providers eliminates cascading re-renders
- ✅ **Strategic Prefetching**: User journey-based prefetching for instant navigation
- ✅ **Performance Monitoring**: Real-time Web Performance API tracking for all routes
- ✅ **Advanced Vite Config**: Page-based chunking, performance budgets, ES2020 target
- ✅ **Bundle Size Reduction**: 95% initial bundle reduction (222KB → 11.5KB)
- ✅ **Performance Budgets**: 500KB chunk warnings with build-time analysis

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
