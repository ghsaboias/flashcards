# Knowledge Graph Quest - Full Integration Reference

## Context & Problem Statement

### User's Learning Challenge
The user has a Chinese flashcards app that had become ineffective due to a **plateau problem**:
- Can recognize characters in the game due to context-dependent recognition
- Randomized character presentation destroyed semantic relationships
- Very few characters actually retained with proper pronunciation/pinyin
- Game became uninteresting after initial memorization phase

### Core Insight
The user's CSV data contained **3,194 hidden relationships** between 218 HSK Level 1 characters that the random drilling system was completely ignoring. These relationships are the key to sustainable learning.

## Learning Methods Research Applied

### Justin Skycak Principles (from Skycak.md)
1. **Bite-sized learning cycles** with immediate practice
2. **Memory anchoring** - establish foundational "anchors" before complexity
3. **Breadth-first learning** - complete foundational layers before advancing
4. **Compound building** - layer chunks on top of chunks
5. **Connection-based review** - test related items together, not randomly

### Research-Backed Methods Integrated
1. **Guided Inquiry** - Student-centered investigation with structured guidance
2. **Triangulation** - Multiple approaches (visual/phonological/semantic/contextual) for validation
3. **Mental Model Anchoring** - Creating memorable reference points that connect new to existing knowledge

### Key Quote from User
> "I can often recognize the characters in the game, because I already sort of expect to see them, so I can easily guess based on remembering other characters... I want to approach this from first principles. I'm frustrated because I memorized a lot of characters in the beginning, but I've plateaued, the game isn't as interesting as it was at the beginning."

## Technical Foundation Built

### 1. Network Data Analysis (`process_hsk_data.py`)
**Completed in 6 minutes**

- **218 individual characters** from HSK Level 1
- **299 compound words** (爸爸, 白天, 北京, etc.)
- **3,194 relationship links** between characters
- **14 semantic domains**: emotions, numbers, family, time, food, transport, body, appearance, places, actions, etc.
- **14 radical families**: 木, 口, 车, 手, 土, 门, 女, 心, 水, 人, etc.

**Hub Score Calculation**: Characters ranked by connectivity
- Top anchors: 谁 (0.69), 地 (0.67), 还 (0.50), 一 (0.23)
- Each cluster has 3-5 anchor characters identified
- Cluster roles assigned: anchor/branch/leaf

### 2. Session Algorithm (`session_generator.js`)
**Completed in 3 minutes**

**5-Phase Progression System**:
1. **Discovery**: Choose semantic domain to explore
2. **Anchor**: Master 3-5 hub characters in chosen cluster
3. **Expansion**: Unlock characters connected to mastered ones
4. **Integration**: Cross-cluster challenges combining multiple domains
5. **Mastery**: Context usage and speed challenges

**Key Classes**:
```javascript
class KnowledgeGraphSession {
  generateSession(phase, clusterId, options)
  selectAnchorCharacters(clusterId, maxChars)
  selectExpansionCharacters(clusterId, maxChars)
  selectIntegrationCharacters(maxChars)
  selectMasteryCharacters(maxChars)
}
```

### 3. Frontend Integration Summary
- **Semantic Sessions** panel on Home launches connection-aware practice and links to the knowledge graph
- **Cluster Picker** exposes all available playlists with phase-aware start buttons and progress
- **Practice Modes** consolidates multi-set, difficulty, SRS, browse, drawing, and stats actions
- **Navigation** presents `Home`, `Semantic`, `Practice`, and `Stats` entries across desktop and mobile

### 3. User Interface (`cluster_selector.html`)
**Completed in 3 minutes**

- Beautiful cluster selection interface with character previews
- Progress tracking and difficulty indicators
- Status badges (Available/Locked/In Progress/Mastered)
- Integration hooks for existing flashcard system

### 4. Visualization (`chinese_network.html`)
**Network visualization showing all character relationships**

- Interactive D3.js force-directed graph
- Color-coded semantic domains
- Hover details with pinyin, tone, meaning
- Click highlighting for connection exploration
- Filtering by domain, radical, tone, frequency

## Current Flashcard System Architecture

### Frontend Structure
- **Framework**: Vite + React TypeScript
- **Architecture**: Hooks/contexts pattern (`frontend/`)
- **Key Files**:
  - `hooks/useSessionManager` - Current session management
  - `contexts/` - Centralized state
  - `components/` - UI components

### Backend Structure
- **Platform**: Cloudflare Worker with Hono framework
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Durable Objects for session state
- **Data**: `hsk30-expanded.csv` with 11,166 rows

### Current Game Mechanics
- **High-intensity mode**: 20+ questions per 30 minutes
- **Progressive unlocks**: 70-85% accuracy gates
- **Spaced repetition**: Built-in SRS scheduling
- **Multi-domain**: Chinese (HSK), World Geography support

## Integration Challenge

### Current Random Selection (Problem)
```typescript
// OLD: Random selection in useSessionManager.ts
const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
```

### Needed: Connection-Aware Selection (Solution)
```typescript
// NEW: Connection-aware selection
const sessionGenerator = new KnowledgeGraphSession(networkData, userProgress);
const session = sessionGenerator.generateSession(currentPhase, selectedCluster);
const practiceCards = session.characters; // Use these instead of random
```

## Files Created & Location

### Core Implementation Files (in `/flashcards/`)
- `process_hsk_data.py` - Enhanced data processing with hub scores
- `hsk_network_data.json` - Network data with cluster information
- `session_generator.js` - Connection-aware session generation logic
- `KNOWLEDGE_GRAPH_QUEST.md` - Complete game specification
- `implementation_roadmap.md` - Progress tracking and next steps

### User Interface Files
- `chinese_network.html` - Network visualization
- `cluster_selector.html` - Learning path selection interface
- `test_session_generator.html` - Algorithm testing interface

### Documentation
- `INTEGRATION_REFERENCE.md` - This file
- `KNOWLEDGE_GRAPH_QUEST.md` - **BEST EXPLANATION OF GAME DESIGN**

## Integration Requirements

### Database Schema Updates Needed
```sql
-- Track cluster progress
CREATE TABLE cluster_progress (
  user_id TEXT,
  cluster_id TEXT,
  phase TEXT CHECK(phase IN ('discovery', 'anchor', 'expansion', 'integration', 'mastery')),
  completion_percentage REAL,
  anchors_mastered INTEGER,
  unlock_date TIMESTAMP,
  PRIMARY KEY (user_id, cluster_id)
);

-- Track character relationships practiced
CREATE TABLE connection_practice (
  user_id TEXT,
  char1 TEXT,
  char2 TEXT,
  connection_type TEXT,
  times_practiced INTEGER DEFAULT 0,
  success_rate REAL,
  last_practiced TIMESTAMP,
  PRIMARY KEY (user_id, char1, char2)
);

-- Enhance existing character table
ALTER TABLE characters ADD COLUMN hub_score REAL DEFAULT 0;
ALTER TABLE characters ADD COLUMN cluster_role TEXT DEFAULT 'leaf';
ALTER TABLE characters ADD COLUMN semantic_domain TEXT;
```

### Frontend Components Needed
1. **ClusterSelector.tsx** - Replace or augment domain selection
2. **PhaseProgressBar.tsx** - Show current learning phase
3. **ConnectionViewer.tsx** - Show character relationships during practice
4. **KnowledgeGraphToggle.tsx** - Switch between random and connection-aware modes

### Session Manager Integration
Replace random card selection logic in `useSessionManager.ts`:
```typescript
// Import session generator
import { KnowledgeGraphSession } from '../utils/sessionGenerator';

// Initialize with network data
const sessionGenerator = new KnowledgeGraphSession(networkData, userProgress);

// Generate connection-aware sessions
const generateSession = (phase: GamePhase, clusterId: string) => {
  return sessionGenerator.generateSession(phase, clusterId, {
    maxCharacters: 8,
    practiceMode: 'mixed',
    targetTime: 30
  });
};
```

## Success Metrics to Track

### Learning Effectiveness
- **Retention**: Characters retained after 1 week/1 month
- **Transfer**: Success using characters in new contexts
- **Connection Strength**: Performance on related vs unrelated characters
- **Engagement**: Session length and frequency

### Technical Performance
- **Session Generation Speed**: < 100ms for character selection
- **UI Responsiveness**: Cluster selection and phase transitions
- **Database Performance**: Connection queries and progress updates

## User's Current State

### What Works
- Existing flashcard system has solid technical foundation
- User is engaged and motivated to improve learning
- Clear understanding of the plateau problem
- Network visualization successfully completed and accessible

### What's Needed
- **Full integration** of connection-aware learning into existing React app
- **User experience** that makes the game interesting again
- **Progress tracking** that respects semantic relationships
- **Smooth transition** from current random system

## Critical Design Decisions

### 1. Integration Strategy
**Recommended**: Hybrid approach allowing users to toggle between modes
- Preserve existing progress and user familiarity
- Allow gradual migration to Knowledge Graph Quest
- Validate effectiveness before full replacement

### 2. Session Flow
**Current**: Domain selection → Random cards → Practice → Results
**Proposed**: Cluster selection → Phase-appropriate cards → Connected practice → Relationship-aware results

### 3. Progress Migration
**Challenge**: Convert existing character-based progress to cluster-based system
**Solution**: Analyze current mastered characters to determine cluster completion states

## Immediate Next Steps for Integration

### Phase 1: Backend Integration (1-2 hours)
1. Import network data into D1 database
2. Add cluster and connection progress tables
3. Update character data with hub scores and domains
4. Create API endpoints for cluster data

### Phase 2: Frontend Integration (2-3 hours)
1. Create cluster selection component
2. Modify session manager to use connection-aware algorithm
3. Add phase progression UI elements
4. Implement toggle between random/connected modes

### Phase 3: Testing & Refinement (1 hour)
1. Validate session generation produces meaningful character sets
2. Test cluster progression and unlock logic
3. Verify progress tracking across phases
4. User testing and feedback incorporation

## Expected Outcomes

### Learning Benefits
- **Reduced plateau effect** through meaningful character connections
- **Improved retention** via semantic clustering and spaced relationships
- **Enhanced engagement** through discovery-based progression
- **Transfer to real usage** via contextual integration phases

### Technical Benefits
- **Intelligent content delivery** replacing random selection
- **Scalable learning system** that works beyond HSK Level 1
- **Rich progress data** enabling learning analytics
- **Modular architecture** supporting future learning domains

---

**This system transforms isolated character drilling into connected knowledge building, directly addressing the user's plateau problem while leveraging proven learning science principles.**
