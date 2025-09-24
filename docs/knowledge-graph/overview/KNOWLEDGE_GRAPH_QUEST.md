# Knowledge Graph Quest — Working Notes

## Vision
Build a connection-aware learning layer on top of the existing SRS so Mandarin study can respect semantic relationships (e.g., family members, shared radicals, compound partners) instead of pure random drilling.

## Current Implementation
- **Data foundation** – `scripts/process_hsk_data.py` rebuilds a 218-character network with 3,194 links across semantic, radical, and compound relationships. The output (`docs/knowledge-graph/datasets/hsk_network_data.json`) drives both the React `/network` page and the standalone HTML prototype.
- **Session generator** – `frontend/src/utils/knowledgeGraphSession.ts` seeds the semantic quick start with cluster-aware selections before delegating to the backend auto-start endpoint.
- **Backend support** – `backend/src/utils/connection-aware-session.ts` groups struggling cards with their connected peers using the curated `character_connections` table (currently 21 high-impact links) and stores progress in `cluster_progress` / `connection_practice`.
- **UI touchpoints**
  - Home quick start defaults the Chinese domain to semantic learning, silently falling back to random sessions if network data is unavailable.
  - `MiniNetworkViewer` renders a small graph in the session view when the auto-start response includes connection metadata.
  - `/network` shows the full graph for exploration and manual study.

## Incomplete / Pending Work
- **Cluster selection UI** – Rebuild a discovery interface so I can deliberately choose domains or phases instead of relying on auto-selection.
- **Phase progress visuals** – The original five-phase concept (Discovery → Anchor → Expansion → Integration → Mastery) exists in notes only; components such as `LiveProgressNetwork` are not wired up.
- **Dataset coverage** – The Python script outputs all 3,194 relationships, but D1 currently stores a minimal subset. Expanding the database is necessary for richer session generation.
- **Testing & validation** – Manual smoke tests verify the quick start path, but broader coverage (phase transitions, progress persistence) remains to be implemented.

## Immediate Next Steps
1. Import the full connection list into D1 and confirm query performance.
2. Design and ship a lightweight cluster selector that works with the existing session manager.
3. Decide how to surface progress feedback (e.g., phase indicator, mastery celebrations) without overwhelming the high-intensity layout.
4. Document manual test plans once the new UI elements land.
