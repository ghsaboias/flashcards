# Personal Chinese Flashcards

A single-user spaced repetition system focused on my Mandarin learning. The app pairs a React 19 frontend with a Cloudflare Workers backend, leaving just enough flexibility to experiment with connection-aware study modes without worrying about multi-user polish.

## Current Knowledge Graph Features
- **Semantic Quick Start** – On the home page, semantic learning is the default for the Chinese domain. The quick-start button auto-selects the next cluster and starts a connection-aware session when network data and Durable Object support are available.
- **Mini Network Viewer** – During connection-aware sessions the practice screen embeds a compact graph so related characters stay visible while answering.
- **Network Explorer Page** – `/network` renders the full D3.js graph for HSK Level 1 characters, including semantic, radical, and compound connections sourced from `hsk_network_data.json`.
- **Data Pipeline** – `scripts/process_hsk_data.py` recreates the 218-node, 3,194-link network JSON from the `data/hsk30-expanded.csv` dataset so the graph can be regenerated or adjusted as experiments continue.

## Practice Experience
- **Quick Start Section** – Toggle between random and semantic learning, then launch an auto-configured session in a single click.
- **High-Intensity Flow** – Sessions run in the condensed high-intensity layout with optional pinyin reveal, audio playback, and streak tracking.
- **Domain Switching** – Geography remains available alongside Chinese through the domain selector in the main layout.

## Architecture Snapshot
- **Frontend** – Vite + React + TypeScript with modular hooks (`useSessionManager`, `useConnectionAwareSession`, etc.), lazy-loaded routes, and static assets in `frontend/src`.
- **Backend** – Cloudflare Worker (`backend/src/worker.ts`) orchestrating Durable Object sessions, SRS scheduling, and the connection-aware selection utilities.
- **Data** – Cloudflare D1 stores card metadata, accuracy stats, and connection tables seeded by the Python script and SQL migrations.

## Development Commands
```bash
# Frontend
cd frontend
bun install
bunx vite            # dev server
bunx eslint .        # lint
bunx tsc -b && bunx vite build

# Backend
cd backend
bun install
bunx wrangler dev    # local worker
db="flashcards"; bunx wrangler d1 migrations apply "$db"
```

## Roadmap Notes
- Flesh out the cluster-selection UI so users can choose semantic domains before launching sessions.
- Surface progress-based visuals (e.g., the LiveProgressNetwork concepts) once the core flow is stable.
- Continue expanding `character_connections` to cover the full 3,194 relationships inside D1.
