# Repository Guidelines

## Knowledge Graph Work in Progress
- **Current tooling**
  - `scripts/process_hsk_data.py` – regenerates the 218-node / 3,194-link network dataset from `data/hsk30-expanded.csv`.
  - docs/knowledge-graph/datasets/hsk_network_data.json — canonical JSON used by documentation/prototypes (the frontend keeps its own copy in `frontend/public`).
  - `docs/knowledge-graph/prototypes/chinese_network.html` – standalone D3 sandbox kept for quick physics tweaks; relies on the sibling JSON.
- **Integrated features**
  - Home quick-start toggle defaults Chinese sessions to `semantic` and routes through `beginConnectionAwareSession`.
  - `MiniNetworkViewer` adds relationship context inside practice sessions when the backend returns connection metadata.
  - `/network` exposes the full force-directed graph for ad-hoc exploration.
- **Backlog**
  - Reintroduce a selectable cluster UI and visualise phase progress once the semantics dataset is fully populated.

## Project Structure Snapshot
- `frontend/` – Vite + React TypeScript application with modular hooks (`useSessionManager`, `useConnectionAwareSession`, etc.) and lazy-loaded routes.
- `backend/` – Cloudflare Worker and Durable Object for sessions, pluggable utilities under `src/utils/` (e.g., `connection-aware-session.ts`).
- `data/hsk30-expanded.csv` – Source vocabulary list; keep large derived artefacts (JSON, HTML prototypes) curated and purposeful.

## Build, Test, and Development Commands
Use Bun everywhere:
```bash
cd frontend && bun install
bunx vite             # dev server
bunx tsc -b && bunx vite build
bunx eslint .

cd backend && bun install
bunx wrangler dev     # local worker tunnel
bunx wrangler d1 migrations apply flashcards
```

## Coding Practices
- TypeScript strict mode must stay green; avoid implicit `any` in exported helpers.
- Keep component names in PascalCase (`QuickStartSection.tsx`) and hooks in camelCase (`useConnectionAwareSession`).
- Prefer focused modules (`session-utils.ts`, `knowledgeGraphSession.ts`) over sprawling files.
- Add concise comments only where the flow is non-obvious (e.g., connection-aware fallbacks).

## Testing
- No automated suite yet; rely on manual smoke tests documented in `frontend/src/tests/navigationFlow-simple.test.ts`.
- Validate both learning modes: semantic quick start (when API responds) and random fallback (when it fails).
- Use `bunx wrangler tail --local` to watch backend logs while experimenting with the knowledge graph endpoints.

## Change Management
- Follow Conventional Commits (`feat:`, `fix:`, `docs:`, etc.).
- Document manual testing in PR descriptions, especially around connection-aware journeys.
- Never commit secrets—configure them through `wrangler.toml` bindings or the Cloudflare dashboard.
