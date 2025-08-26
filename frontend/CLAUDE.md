# Frontend (Vite + React) — Development Guide

React 19 + TypeScript app built with Vite. Built assets are served by the Cloudflare Worker via Wrangler `[assets]` binding.

## Quick Commands
```bash
cd frontend
npm install
npm run dev       # Start Vite dev server (default :5173)
npm run build     # Type-check + production build
npm run lint      # ESLint (keep 0 warnings)
npm run preview   # Preview built app locally
```

## Recommended Dev Flow
- Worker-driven: build frontend, then run the backend Worker which serves the dist assets.
  ```bash
  cd frontend && npm run build
  cd ../backend && npm run dev  # http://localhost:8787
  ```
- Vite dev (optional): if you prefer Vite HMR, set API base so calls hit the Worker.
  ```bash
  # frontend/.env.local
  VITE_API_BASE=http://localhost:8787/api
  ```
  Then run `npm run dev` in `frontend` and `npm run dev` in `backend`.

## File Map (essentials)
- `src/App.tsx`: Main UI and feature flows
- `src/api.ts`: REST client (`VITE_API_BASE` or `/api` by default)
- `src/components/`:
  - `SrsTable.tsx`: Due cards table with sorting and UTC helpers
  - `StatsTable.tsx`: Per-card accuracy table with filters
  - `DrawingCanvas.tsx`: Character drawing component (progress/completion callbacks)
- `src/utils/pinyin.ts`: Lazy-loaded `pinyin-pro` helpers
- `index.html`, `public/`: Static assets

## Performance Notes
- Lazy load `pinyin-pro` only when Chinese text is detected (see `utils/pinyin.ts`).
- Vite manual chunks separate vendor/pinyin/utils to keep initial bundle lean.
- Keep bundle warnings clean; monitor output sizes on build.
 - UI includes a "Performance Analytics" panel powered by `GET /api/performance`.

## Quality Standards
- Zero TypeScript errors on build.
- Zero ESLint warnings (`npm run lint`).
- Avoid large dependencies in the main path; prefer lazy imports when feasible.

## Troubleshooting
- Blank page/404 assets: run a fresh `frontend npm run build` before `backend npm run dev`.
- API 401 during dev: backend may enforce Bearer token. Remove `Authorization` header or match `API_TOKEN` if set.
- CORS errors on Vite dev: set `VITE_API_BASE=http://localhost:8787/api` in `frontend/.env.local`.
- Slow pinyin: ensure lazy import path remains in `utils/pinyin.ts`; avoid eager imports in components.
