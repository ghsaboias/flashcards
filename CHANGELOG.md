# HSK Flashcards — Changelog

Historical improvements, fixes, and technical changes for the HSK Flashcards project.

## 2025-09-23 — Semantic Learning Simplification
- **SIMPLIFICATION**: Streamlined semantic learning entry with one-click access
- **Removed Components**: ConnectionAwarePage (250 lines) and ClusterPickerSection (69 lines) - redundant cluster selection UIs
- **Removed State**: `showClusterSelection` flag and `currentPhase` tracking across 6+ files
- **Removed Routes**: `/connection-aware` and `/knowledge-graph` routes - replaced with direct "Explore Character Network" button
- **Auto-Selection**: Semantic learning now auto-selects best cluster based on completion percentage
- **Preserved Network**: All network visualization features intact (NetworkPage, MiniNetworkViewer, LiveProgressNetwork)
- **Code Reduction**: Eliminated 320+ lines of redundant UI code while maintaining all learning intelligence
- **UX Improvement**: Reduced semantic learning from 3-4 clicks to single click for personal use optimization

## 2025-12-24 — Interactive Network Visualization - COMPLETE D3.JS IMPLEMENTATION
- **NEW FEATURE**: NetworkPage with exact physics matching standalone chinese_network.html version
- **Full D3.js Integration**: Interactive character network with force simulation (450+ lines)
- **Exact Physics Match**: Same force parameters, distances, and collision detection as HTML version
- **Visual Excellence**: Fixed domain colors, tooltip with tone arrows, click highlighting, zoom behavior
- **Performance Optimized**: 9.35KB lazy-loaded chunk (3.56KB gzipped) with route-based splitting
- **Complete Interactivity**: Mouse hover tooltips, click connection highlighting, drag nodes, zoom with mouse wheel
- **Filter Controls**: Domain, radical, tone, and frequency filters with real-time stats
- **URL Route**: `/network` provides full network exploration experience
- **Technical Achievement**: React/TypeScript version matches HTML physics exactly with proper D3 patterns

## 2025-10-07 — Home Hub & Session Core Cleanup
- **Home Hub**: replaced the single home panel with three sections — Semantic Sessions, Cluster Picker, Practice Modes — so every workflow is visible from the dashboard.
- **Practice Route**: `/practice` now reuses the same Practice Modes component, eliminating duplicate markup and behaviors.
- **Navigation Labels**: desktop and mobile navigation use concise entries (`Home`, `Semantic`, `Practice`, `Stats`) for faster context switching.
- **Session Manager Modules**: `useSessionManager` now composes new hooks (`useSessionStateStore`, `useSessionLifecycle`, `useSessionData`, `useConnectionAwareSession`) for clearer responsibilities.

## 2025-09-23 — Knowledge Graph Quest - COMPLETE 3-PHASE IMPLEMENTATION
- **REVOLUTIONARY FEATURE**: Complete Knowledge Graph Quest with stunning visual learning experience
- **Phase 1 - Visual Cluster Selection**: Beautiful gradient cluster cards with progress bars and difficulty badges
- **Phase 2 - Practice Session Network**: MiniNetworkViewer showing character relationships during practice
- **Phase 3 - Live Progress Visualization**: LiveProgressNetwork with real-time animated progress updates and mastery celebrations
- **New Components**: 3 major components (~550 lines): ClusterSelector, MiniNetworkViewer, LiveProgressNetwork
- **Database Fix**: Resolved parameter binding error in connection-aware selection logic
- **Navigation Integration**: Added "Explore Character Network" button for direct network access
- **Bundle Optimization**: Streamlined semantic learning with auto-cluster selection
- **User Journey**: Complete flow from cluster selection → network visualization → practice sessions → progress tracking
- **Visual Excellence**: SVG animations, progress rings, connection lighting, celebration effects
- **Production Ready**: Full visual experience accessible at https://game.fasttakeoff.org/knowledge-graph

## 2025-01-25 — Connection-Aware Learning System - BACKEND FOUNDATION
- **BACKEND FOUNDATION**: Connection-aware learning system backend infrastructure implemented
- **Frontend Integration**: Added semantic vs random learning mode toggle in HighIntensityMode component
- **Backend Intelligence**: Implemented connection-aware character selection in SessionsDO with semantic clustering
- **User Experience**: Set connection-aware learning as default for Chinese domain with educational messaging
- **Database Utilization**: Leverages existing `character_connections` table (21 semantic relationships across 214 characters)
- **Smart Selection**: Prioritizes struggling characters (<80% accuracy) plus their semantic connections
- **Semantic Ordering**: Preserves meaningful character relationships instead of random shuffling
- **Research Impact**: Successfully addresses plateau problem identified in learning science research

## 2025-08-26 — Modular Docs & Cleanup
- Added module docs: `backend/CLAUDE.md`, `frontend/CLAUDE.md`.
- Updated root `CLAUDE.md`: core rules, module links, API/DB pointers.
- Removed `card-review/` (not required for build/run/deploy).
- Introduced `CHANGELOG.md` for dated history.
