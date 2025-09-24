# Exact File Recreation Instructions

## Context
During migration bootstrap cleanup, 3 critical development files were accidentally deleted:
1. `process_hsk_data.py` - Network data processing script (PARTIALLY RECREATED)
2. `session_generator.js` - Connection-aware session algorithm (NEEDS RECREATION)
3. `chinese_network.html` - Standalone D3.js network visualization (NEEDS RECREATION)

The functionality exists in the integrated React app, but the standalone development/testing tools were lost.

## File 1: `process_hsk_data.py` - NEEDS PERFECT MATCHING

### Current Status
- ✅ Script exists and runs successfully
- ✅ Perfect structure match (all keys identical)
- ❌ **213 nodes vs target 218** (missing 5 characters)
- ❌ **2163 links vs target 3194** (missing 1031 connections)

### Target Specifications
- **Exact input**: `hsk30-expanded.csv` (exists in root)
- **Exact output**: `hsk_network_data_recreated.json` (do NOT overwrite `frontend/public/hsk_network_data.json`)
- **Target metrics**: 218 nodes, 3194 links
- **Validation command**: `python3 -c "import json; data=json.load(open('hsk_network_data_recreated.json')); print(f'Nodes: {len(data[\"nodes\"])}, Links: {len(data[\"links\"])}')`

### Required Tasks
1. **Fix missing characters**: Extract exact character list from original file, ensure all 218 are included
2. **Expand connection generation**: Current logic produces 2163, need 3194 total
   - Semantic: Currently ~2000, likely need more comprehensive domain connections
   - Radical: Currently ~140, need more radical families and connections
   - Compound: Currently ~30, need extensive compound word database
3. **Verify exact data integrity**: Hub scores, cluster roles, POS tags must match original patterns

### Debug Commands
```bash
# Check character extraction accuracy
python3 -c "
import json
with open('frontend/public/hsk_network_data.json') as f:
    orig = json.load(f)
chars = [n['char'] for n in orig['nodes']]
print('Missing chars to add to script:', set(chars) - set('existing_list'))
"

# Analyze connection distribution
python3 -c "
import json
from collections import Counter
with open('frontend/public/hsk_network_data.json') as f:
    data = json.load(f)
types = Counter(link['type'] for link in data['links'])
print('Connection types:', dict(types))
"
```

## File 2: `session_generator.js` - NEEDS FULL RECREATION

### Target Specifications
- **Source material**: Integrated backend code in `backend/src/utils/connection-aware-session.ts`
- **Output**: `session_generator.js` (standalone testing tool)
- **Purpose**: Connection-aware character selection algorithm for Knowledge Graph Quest

### Required Components
1. **Character Connection Logic**:
   - Load network data from JSON
   - Identify struggling characters (<80% accuracy)
   - Find semantically connected characters
   - Generate practice sequences

2. **5-Phase Learning System**:
   - Discovery: Visual cluster selection
   - Anchor: Master hub characters
   - Expansion: Unlock connected characters
   - Integration: Multi-cluster practice
   - Mastery: Context usage

3. **Testing Interface**:
   - Input: Character list or performance data
   - Output: Recommended practice sequence
   - Debugging: Show connection reasoning

### Source References
- **Main algorithm**: `backend/src/utils/connection-aware-session.ts:applyConnectionAwareSelection()`
- **Struggling detection**: `getStruggleCharacters()` function
- **Connection queries**: `getConnectedCharacters()` function
- **Semantic clustering**: `clusterBySemantics()` function

## File 3: `chinese_network.html` - NEEDS FULL RECREATION

### Target Specifications
- **Source material**: `frontend/src/pages/NetworkPage.tsx` (450+ lines of D3.js)
- **Output**: `chinese_network.html` (standalone visualization)
- **Purpose**: Interactive character network visualization with exact physics

### Required Components
1. **D3.js Network Visualization**:
   - Force simulation with exact physics parameters
   - Node positioning and collision detection
   - Interactive zoom, pan, drag
   - Color coding by semantic domain

2. **Character Relationship Display**:
   - Semantic connections (blue)
   - Compound connections (green)
   - Radical connections (yellow)
   - Connection strength via line thickness

3. **Standalone HTML Structure**:
   - Load network data from JSON
   - Embedded CSS matching NetworkPage.css
   - No React dependencies

### Source References
- **D3.js implementation**: `frontend/src/pages/NetworkPage.tsx:useEffect()` hook
- **Physics parameters**: Force configuration in NetworkPage
- **Styling**: `frontend/src/styles/NetworkPage.css` (exact replica comment exists)

## Next Steps After Recreation

### 4. Review git status and stage migration bootstrap changes
**Context**: Migration bootstrap is complete but needs git commit
- **Files to stage**:
  - `backend/wrangler.toml` (added `migrations_dir`)
  - `backend/migrations/0003_add_sample_domains.sql` (renamed from geography)
  - New migration files 0004-0008
- **Files to ignore**: Generated `*_recreated.json` files and standalone tools
- **Commit message**: `feat: bootstrap D1 migration history for existing schema`

### 5. Update documentation for migration bootstrap
**Context**: CLAUDE.md needs migration section update
- **Update location**: Migration section in main CLAUDE.md
- **Add content**:
  - Bootstrap process explanation
  - Migration history tracking (0001-0008 applied)
  - Safe path for future migrations
  - Skipped risky migrations explanation

## Validation Commands

### Overall Success Check
```bash
# Verify all recreated files
ls -la *.py *.js *.html | grep -v frontend
python3 process_hsk_data.py  # Should output: Nodes: 218, Links: 3194
node session_generator.js --test  # Should run connection algorithm test
open chinese_network.html  # Should display interactive network

# Confirm no target files touched
ls -la frontend/public/hsk_network_data.json  # Should remain unchanged
```

### File Integrity Verification
```bash
# Structure validation
python3 -c "
import json
files = ['frontend/public/hsk_network_data.json', 'hsk_network_data_recreated.json']
for f in files:
    data = json.load(open(f))
    print(f'{f}: {len(data[\"nodes\"])} nodes, {len(data[\"links\"])} links')
    print('  Keys match:', sorted(data['nodes'][0].keys()) == sorted(data['links'][0].keys()))
"
```

## Success Criteria
- [ ] `process_hsk_data.py` generates exactly 218 nodes, 3194 links
- [ ] `session_generator.js` implements connection-aware algorithm
- [ ] `chinese_network.html` displays interactive D3.js network
- [ ] All files functional as standalone development tools
- [ ] No modification to `frontend/public/hsk_network_data.json`
- [ ] Migration bootstrap documented and committed