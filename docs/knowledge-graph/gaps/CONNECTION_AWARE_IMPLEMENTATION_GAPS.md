# Connection-Aware Implementation Status

## Summary
Connection-aware learning is partially wired into the app: quick start defaults to semantic mode for the Chinese domain and the backend can re-order cards using limited relationship data. However, several planned components (cluster picker, phase visuals, full data import) remain outstanding.

## What Works Today
- `scripts/process_hsk_data.py` produces the full network dataset and keeps the JSON in sync with the standalone D3 prototype.
- `knowledgeGraphSession.ts` seeds semantic sessions by picking clusters and characters based on the JSON file.
- `useConnectionAwareSession` integrates the generator with the auto-start endpoint and shares connection metadata with the session UI.
- `MiniNetworkViewer` presents linked characters during practice, and `/network` offers a deep dive into the full graph.

## Key Gaps
1. **Data coverage**
   - D1 only stores 21 curated connections; the vast majority of relationships remain in JSON only.
   - Without broader data, semantic sessions frequently fall back to random drilling after the first few cards.
2. **Discovery UI**
   - The previous cluster selector and `/connection-aware` page were removed. There is no explicit way to choose domains or phases beyond the auto-selection logic.
3. **Progress visualisation**
   - Phase progress bars, mastery celebrations, and other visuals are not connected to live data.
4. **Testing & telemetry**
   - Manual smoke tests cover quick start success/failure, but there is no automated verification or analytics to track connection-aware effectiveness.

## Recommended Priorities
1. Import the full connection list into D1 (`character_connections`, `cluster_progress`) and verify performance.
2. Reintroduce a simple cluster/phase selector that works with the current session manager and backend payloads.
3. Add minimal progress indicators once data is in place (e.g., anchors mastered, cluster completion percentage).
4. Extend manual test scripts to include semantic flow regression checks and document expected fallbacks.

## Reference Files
- `scripts/process_hsk_data.py`
- `frontend/src/utils/knowledgeGraphSession.ts`
- `frontend/src/hooks/useConnectionAwareSession.ts`
- `backend/src/utils/connection-aware-session.ts`
