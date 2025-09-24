# HSK Flashcards — Changelog

Historical improvements, fixes, and technical changes for the HSK Flashcards project.

## 2025-12-24 — Network Explorer Route
- Added `/network` with a D3.js force-directed graph that mirrors the standalone HTML prototype.
- Matched force parameters, zoom/pan behaviour, and colouring to the Python-generated dataset.
- Deferred richer progress overlays (e.g., live mastery rings) until the semantic flow settles.

## 2025-10-07 — Home Hub & Session Core Cleanup
- Replaced the monolithic home panel with quick start + advanced practice panels.
- Allowed `/practice` to reuse the traditional modes panel for bookmarked users.
- Simplified navigation labels to `Home`, `Practice`, `Network`, and `Stats`.
- Modularised session management (`useSessionManager` now composes specialised hooks).

## 2025-09-23 — Semantic Quick Start Defaults
- Removed the unfinished cluster selector UI and dedicated `/connection-aware` route.
- Defaulted the Chinese domain to semantic mode in `QuickStartSection`, auto-selecting a recommended cluster when available.
- Embedded `MiniNetworkViewer` inside the practice view to show related characters during connection-aware sessions.
- Preserved a single session flow that toggles between random and semantic learning.

## 2025-01-25 — Connection-Aware Backend Foundation
- Introduced Durable Object helpers that group struggling cards with their semantic connections (currently backed by 21 curated relationships).
- Added `/api/network-data/:domain_id` and `/api/user-progress/:domain_id` endpoints plus the associated D1 tables.
- Allowed auto-start sessions to opt into `connection_aware` selection while keeping random drilling as a fallback.

## 2025-08-26 — Modular Docs & Cleanup
- Added module-level documentation: `backend/CLAUDE.md`, `frontend/CLAUDE.md`.
- Updated this file to capture project history.
- Removed obsolete `card-review/` utilities from the repo root.
