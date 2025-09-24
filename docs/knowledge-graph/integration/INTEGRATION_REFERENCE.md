# Knowledge Graph Integration Reference

## Problem Recap
Random drilling made it easy to guess upcoming characters and ignore semantic ties. The goal is to introduce connection-aware sessions that surface related vocabulary (shared radicals, domains, compounds) while keeping the app lightweight for a single user.

## Data & Analysis
- **Source dataset**: `data/hsk30-expanded.csv` (HSK Level 1 focus).
- **Processing**: `scripts/process_hsk_data.py` converts the CSV into a curated graph with:
  - 218 character nodes (including a handful of polysemous duplicates for tone/meaning variants).
  - 3,194 relationships split across semantic, radical, and compound edges.
  - Hub scores and cluster roles derived from connectivity.
- **JSON output**: `docs/knowledge-graph/datasets/hsk_network_data.json` (documentation/prototype copy; `frontend/public/hsk_network_data.json` is served to the app).

## Frontend Touchpoints
1. **Quick start semantic mode**
   - `QuickStartSection.tsx` defaults the Chinese domain to `semantic` and auto-selects the lowest-completion cluster returned by `KnowledgeGraphSession`.
   - Falls back to `random` if initialisation fails.
2. **Connection-aware sessions**
   - `useConnectionAwareSession` fetches `/api/network-data/:domain_id` and `/api/user-progress/:domain_id`, creates a `KnowledgeGraphSession`, and injects `connection_aware` into the auto-start payload.
   - `PracticeSession.tsx` shows `MiniNetworkViewer` when the auto-start response contains `connection_session` metadata.
3. **Network explorer**
   - `NetworkPage.tsx` renders the full graph, matching the physics of the standalone HTML.

## Backend Support
- **Routes** (in `backend/src/routes/connection-aware.ts`):
  - `GET /api/network-data/:domain_id` – returns nodes, links, and clusters.
  - `GET /api/user-progress/:domain_id` – returns `cluster_progress` and `connection_practice` rows.
  - `POST /api/cluster-progress` and `POST /api/connection-practice` – update tables when sessions complete.
- **Session selection** (in `backend/src/utils/connection-aware-session.ts`):
  - Identifies struggling cards (<80% accuracy) and attaches semantically related cards based on `character_connections`.
  - Groups cards by semantic links if no struggling cards are found.
- **Schema additions** (see migrations 0004–0007):
  - `semantic_clusters`, `character_connections`, `cluster_progress`, `connection_practice`.

## Current Limitations
- D1 only contains a minimal set of connections (21), so semantic sessions still lean on auto-selection heuristics rather than full graph coverage.
- Cluster selection and phase tracking UI have not yet been rebuilt after the simplification pass; sessions are effectively in “auto anchor” mode.
- Progress visualisation (e.g., LiveProgressNetwork) remains experimental.

## Suggested Workflow for Expanding the Feature
1. **Populate data** – Import additional links into D1, keeping referential integrity with the `cards` table.
2. **Enhance UI** – Reintroduce cluster selection and phase indicators based on data readiness.
3. **Telemetry** – Record connection-aware vs random success metrics via `connection_practice`.
4. **Testing** – Extend manual test scripts (or add Vitest coverage) to verify semantic sessions, fallbacks, and explorer interactions.
