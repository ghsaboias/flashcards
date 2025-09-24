# Connection-Aware Testing Guide

## Purpose
Outline the manual steps needed to verify the current semantic-learning flow and highlight where the system still falls back to random drilling. Automated coverage is still pending.

## Prerequisites
- Backend running locally: `cd backend && bunx wrangler dev --local` (http://localhost:8787).
- D1 seeded with the latest schema and sample data: `bunx wrangler d1 migrations apply flashcards`.
- Frontend served via `cd frontend && bunx vite`.

## Smoke Test Checklist
1. **Random mode fallback**
   - Load `/`.
   - Switch the quick-start toggle to `random` and start a session.
   - Confirm the session launches and that `MiniNetworkViewer` is hidden.
2. **Semantic quick start (happy path)**
   - With the backend returning network data, ensure the Chinese domain is selected.
   - Leave the toggle on `semantic`, click quick start, and confirm the session enters high-intensity mode with the embedded `MiniNetworkViewer`.
   - Finish a few cards and watch the backend logs for `connection_aware` payloads.
3. **Semantic fallback**
   - Stop the backend or force `/api/network-data/chinese` to fail.
   - Reload the frontend and confirm the toggle reverts to `random` with a console warning.
4. **Network explorer**
   - Visit `/network`.
   - Verify the graph loads, zoom and drag work, and tooltips show character details.

## API Spot Checks
```bash
curl -s http://localhost:8787/api/network-data/chinese | jq '.nodes | length'
# Expect 200+ nodes (depending on seeded dataset)

curl -s http://localhost:8787/api/user-progress/chinese | jq '.cluster_progress | length'
# Expect 0 or more rows (default user)
```

## D1 Data Validation
- Confirm the number of rows in `character_connections`; if only 21 rows exist, semantic grouping will be limited.
- After a session, check `connection_practice` for new or updated rows tied to the `default_user`.

## Pending Coverage
- Phase-specific UI/logic (cluster discovery, progress bars) — not yet implemented.
- Automated Vitest suites for session flows.
- Metrics/alerts around connection-aware success vs random fallback.
