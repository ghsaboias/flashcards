# Frontend (Vite + React) — Development Guide

## Overview
- **Framework**: React 19 + Vite + TypeScript.
- **Routing**: React Router with lazy-loaded routes; only `HomePage` is eager.
- **Styling**: CSS modules organised under `src/styles/` with focused files for network/connection-aware views.
- **Build tooling**: Bun scripts (`bunx vite`, `bunx eslint .`, `bunx tsc -b`).

## Quick Commands
```bash
cd frontend
bun install
bunx vite                 # dev server
bunx tsc -b && bunx vite build
bunx eslint .
```

## Key Entry Points
- `main.tsx` – mounts the app within `AppProvider` and `SessionContext`.
- `router.tsx` – defines all routes (`/`, `/practice`, `/session/:id`, `/complete/:id`, `/network`, `/stats`, etc.) with lazy imports and simple performance markers.
- `App.tsx.legacy` – kept for reference only; all UI now flows through routed pages.

## Page Components (`src/pages/`)
- `HomePage.tsx` – quick start toggle between random and semantic modes, “Explore Character Network” CTA, advanced practice reveal.
- `PracticePage.tsx` – exposes traditional modes for bookmarked users.
- `SessionPage.tsx` – renders the active session (high-intensity layout) and hosts the `MiniNetworkViewer` when semantic metadata is present.
- `CompletePage.tsx`, `StatsPage.tsx`, `BrowsePage.tsx`, `DrawingPage.tsx` – legacy flows still in use.
- `NetworkPage.tsx` – D3 force-directed explorer consuming `hsk_network_data.json`.

## Core Components (`src/components/`)
- `QuickStartSection.tsx` – home quick-start controls, semantic toggle, auto cluster selection.
- `PracticeSession.tsx` – high-intensity session UI with optional pinyin toggle, audio playback, and mini network embedding.
- `MiniNetworkViewer.tsx` – small SVG network for the current question.
- `TraditionalModes.tsx` + `home/PracticeModesSection.tsx` – multi-set/SRS/difficulty launchers.
- `NewCardsPromptManager.tsx`, `SessionComplete.tsx`, `RouteLoadingFallback.tsx` – supporting views.

## Hooks & Context
- `useSessionManager.ts` – orchestrates session lifecycle, integrates random/semantic modes, and talks to the backend auto-start endpoint.
- `useConnectionAwareSession.ts` – fetches network data, initialises `KnowledgeGraphSession`, and exposes `beginConnectionAwareSession`.
- `useNetworkVisualization.ts` + `useNetworkFilters.ts` – handle the D3 graph setup for `/network`.
- `useSessionStateStore.ts`, `useSessionLifecycle.ts`, `useSessionData.ts` – modular pieces composed by the session manager.

## Utilities
- `knowledgeGraphSession.ts` – frontend session generator mirroring backend logic.
- `network-helpers.ts`, `network-colors.ts` – shared helpers for the network UI.
- `session-utils.ts`, `hsk-label-utils.ts`, `stats-aggregation.ts` – general SRS helpers.

## Styling
- `styles/ConnectionAware.css` – semantic quick-start / practice adjustments.
- `styles/NetworkPage.css` – full graph explorer styling.
- `styles/home.css` – home layout and advanced options panel.

## Performance Notes
- Lazy-loaded routes keep the main bundle small; watch the network graph chunk (~9KB) and pinyin chunk (~300KB, lazy).
- The router fires `markRouteStart`/`markRouteEnd` hooks for lightweight navigation timing (see `utils/performance-simple.ts`).
- Prefetching in `HomePage.tsx` grabs practice and session routes shortly after first render.

## Testing
- Manual test checklist lives at `src/tests/navigationFlow-simple.test.ts`.
- Verify both toggles (random/semantic) before releases; semantic mode should fall back cleanly if the API errors.

## Pending Frontend Work
- Rebuild a compact cluster selection experience to complement the auto mode.
- Integrate phase/progress visuals once backend data is ready.
- Add automated tests around session creation and the network explorer interactions.
