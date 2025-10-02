# Flashcards Project Brief

## Project Focus
- **Audience**: Single-user Mandarin learner (me). All product decisions optimise my study flow.
- **Stack**: React 19 + Vite in the frontend, Cloudflare Worker + Durable Object in the backend, Cloudflare D1 for storage.
- **Goal**: Keep the high-intensity SRS core stable while layering in connection-aware experiments for Chinese characters.

## Knowledge Graph Status
- **Connection-aware quick start** – The home page defaults the Chinese domain to `semantic` mode. When the backend confirms network data, the quick-start button launches a session seeded by `KnowledgeGraphSession` and marks the session as connection-aware.
- **Practice integrations** – `MiniNetworkViewer` renders related characters inside the question view whenever the session payload includes `connection_session` metadata. LiveProgressNetwork concepts remain exploratory and are not currently rendered.
- **Network explorer route** – `/network` lazy-loads a D3-based graph fed by `frontend/public/hsk_network_data.json`. It supports zooming, dragging, basic filters, and tooltips.
- **Data generation** – `scripts/process_hsk_data.py` regenerates the JSON graph from `data/hsk30-expanded.csv`, keeping 218 nodes, 3,194 edges, hub scores, semantic domains, and cluster roles aligned with the app. Use it to refresh the dataset before committing curated changes.
- **Next experiments** – Re-introduce explicit cluster selection, surface five-phase progress UI once session heuristics settle, and finish loading the remaining relationship data into D1.

## Repository Layout (selected)
```
flashcards/
├── README.md                    # High-level summary (personal focus)
├── CLAUDE.md                    # This document
├── AGENTS.md                    # Process guidelines for contributors/agents
├── backend/
│   ├── schema.sql               # Baseline D1 schema
│   ├── migrations/              # Ordered migration history (0001+)
│   └── src/                     # Worker entrypoints + utilities
├── frontend/
│   ├── src/                     # React pages, components, hooks, utils
│   └── public/hsk_network_data.json
├── data/                        # Source datasets
│   └── hsk30-expanded.csv
├── docs/
│   ├── PRINCIPLES.md
│   ├── USER_FLOWS.md
│   └── knowledge-graph/         # Documentation + artefacts
│       ├── overview/            # Vision & working notes
│       ├── integration/         # Tech reference
│       ├── roadmap/             # Implementation plan
│       ├── gaps/                # Gap analysis
│       ├── testing/             # Manual test guide
│       ├── datasets/            # JSON exports used by docs/prototypes
│       ├── prototypes/          # Legacy D3 sandbox
│       └── procedures/          # Regeneration instructions
└── scripts/
    └── process_hsk_data.py
```

## Cross-Reference Guides
- **Frontend details** – `frontend/CLAUDE.md`
- **Backend APIs & schema** – `backend/CLAUDE.md`
- **Change history** – `CHANGELOG.md`
- **User interaction map** – `docs/USER_FLOWS.md`
- **Knowledge graph design + backlog** – `docs/knowledge-graph/overview/KNOWLEDGE_GRAPH_QUEST.md`

## Development Workflow
1. Use Bun for scripts (`bunx vite`, `bunx wrangler dev`, etc.).
2. Keep TypeScript strict mode passing and ESLint clean.
3. When regenerating network data, commit curated JSON only—avoid ad-hoc CSV exports.
4. Manual smoke tests: run the frontend dev server, confirm quick start toggles both modes, and verify `/network` loads.
5. Autobuild check before sharing work: `bunx tsc -b && bunx vite build` then `bunx eslint .` inside `frontend`.
6. **Commit messages**: Keep them clean and professional. NEVER add Claude Code attribution or co-author tags.

## Testing Notes
- Automated tests are minimal; `frontend/src/tests/navigationFlow-simple.test.ts` documents the expected manual checks.
- When the connection-aware API is unavailable, the frontend gracefully falls back to random sessions; confirm this path manually after changes touching the network features.

## Pending Items to Track
- Populate D1 with the full connection graph to unlock richer suggestions.
- Revisit UX around cluster choice and multi-phase progress visuals.
- Expand documentation once new flows (e.g., visual progress network) ship so the knowledge graph guides stay truthful.
