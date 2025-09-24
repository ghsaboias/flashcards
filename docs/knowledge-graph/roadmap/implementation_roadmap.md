# Knowledge Graph Roadmap

## Completed Foundations
- Generated a reproducible HSK Level 1 network (`scripts/process_hsk_data.py` → `docs/knowledge-graph/datasets/hsk_network_data.json`).
- Wired the frontend session generator (`knowledgeGraphSession.ts`) so quick-start can request semantic sessions.
- Added backend helpers (`connection-aware-session.ts`, new D1 tables) to mix struggling characters with their neighbours.
- Embedded `MiniNetworkViewer` in the practice UI and shipped the `/network` explorer for manual study.

## Active Work
1. **Database population**
   - Import the full 3,194 relationships into D1.
   - Validate query performance and adjust indexes if needed.
2. **Cluster discovery UI**
   - Provide a lightweight page or panel for choosing semantic clusters and phases explicitly.
   - Reflect selection back into `useSessionManager` so the auto-start payload respects the user choice.
3. **Progress feedback**
   - Decide on a minimal phase indicator or progress bar for semantic sessions.
   - Integrate any celebration/animation concepts into the high-intensity layout without distraction.

## Later Enhancements
- Expand analytics (connection mastery, cluster completion summaries).
- Experiment with spaced review that prefers connected characters after mistakes.
- Revisit the standalone HTML prototype to keep its physics in sync and retire it once the React explorer is sufficient.

## Notes
- Keep docs updated as pieces land; avoid overstating completion until the UI reflects it.
- Manual testing remains the primary validation path—extend the navigation test checklist whenever new flows appear.
