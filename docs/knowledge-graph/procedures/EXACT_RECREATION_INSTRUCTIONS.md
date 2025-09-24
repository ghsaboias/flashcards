# Network Data Recreation Instructions

## Context
`scripts/process_hsk_data.py` is the authoritative script for rebuilding the HSK Level 1 network JSON that powers the React explorer and the legacy HTML prototype. Keep the script and outputs in sync so we can tweak clustering experiments confidently.

## Files Involved
1. `scripts/process_hsk_data.py` — Python script that generates the graph.
2. `data/hsk30-expanded.csv` — Source dataset for HSK Level 1 vocabulary.
3. `docs/knowledge-graph/datasets/hsk_network_data.json` — Canonical JSON copy used by prototypes and documentation (frontend still serves its own copy from `frontend/public`).
4. `docs/knowledge-graph/datasets/hsk_network_data_recreated.json` — Optional regeneration output for diffing/validation.
5. `docs/knowledge-graph/prototypes/chinese_network.html` — Legacy D3 prototype that loads the JSON via a relative path.

## Expected Output
- **Nodes**: 218 single-character entries (including a few duplicates for alternate pronunciations).
- **Links**: 3,194 connections tagged as `semantic`, `radical`, or `compound`.
- **Metadata**: Hub scores, cluster roles, semantic domains, and optional compound metadata.

## Regeneration Steps
```bash
# Run from repository root
python3 scripts/process_hsk_data.py
# Outputs docs/knowledge-graph/datasets/hsk_network_data_recreated.json and prints stats.

# Refresh canonical copies when satisfied
cp docs/knowledge-graph/datasets/hsk_network_data_recreated.json \
   docs/knowledge-graph/datasets/hsk_network_data.json
cp docs/knowledge-graph/datasets/hsk_network_data_recreated.json \
   frontend/public/hsk_network_data.json
```

## Validation
```bash
python3 -c "import json; data=json.load(open('docs/knowledge-graph/datasets/hsk_network_data_recreated.json')); print(len(data['nodes']), len(data['links']))"
# Expect: 218 3194
```

## Notes
- Only commit curated JSON updates—avoid committing intermediate experiments that change ordering or structure.
- Update the Cloudflare D1 dataset separately if you intend to expose additional connections through the backend API.
- Once the React explorer fully replaces the HTML prototype, consider archiving or deleting `docs/knowledge-graph/prototypes/chinese_network.html` and the duplicate dataset copy.
