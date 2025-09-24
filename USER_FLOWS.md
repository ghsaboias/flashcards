# HSK Flashcards Application - Complete User Flow Map

Based on my deep exploration of your codebase, here's a comprehensive mapping of all user flows in your HSK flashcards application:

## **🎯 Entry Points & Mode Selection**

### **Home Panels** (default landing)
```
Home → Semantic Sessions panel
├── Start Semantic Session → `beginConnectionAwareSession()` → `/session/:id`
├── Knowledge Graph → `/connection-aware`
└── Toggle Advanced → opens Practice Modes panel

Home → Cluster Picker panel (visible when discovery is required)
├── Choose Cluster → `setSelectedCluster()` / `setCurrentPhase()`
└── Start Phase → `beginConnectionAwareSession()`

Home → Practice Modes panel
├── Multi-set / Difficulty / SRS → `beginMultiSetSession()` family
├── Browse / Drawing shortcuts → `/browse/:set`, `/drawing/:set`
└── Stats shortcut → `/stats`
```

### **Dedicated Routes**
```
Semantic nav → `/connection-aware`
├── Demo overview + phase progress
└── Same cluster actions as Home

Practice nav → `/practice`
└── Renders the Home Practice Modes panel for bookmarked users

Stats nav → `/stats`
└── Performance, SRS, accuracy dashboards
```

## **📚 Practice Mode Flows**

### **1. High-Intensity Practice** (Primary Flow)
```
🚀 Start Practice → Auto Session
├── Backend: `POST /api/sessions/auto-start` with {user_level, focus_mode}
├── Session State: Adaptive content selection based on performance
├── Question Presentation:
│   ├── Full-screen Chinese character
│   ├── Minimal UI (progress only)
│   ├── Auto-TTS for Chinese characters
│   └── Response time tracking (ms precision)
└── Answer Flow:
    ├── Text input → Submit → `answerWithTiming()`
    ├── Adaptive feedback (2-6 seconds based on difficulty)
    ├── Immediate next question OR session complete
    └── Progressive difficulty adjustment
```

### **2. Traditional Practice Modes**
```
Practice Mode Selection:
├── Start Practice → `beginSetSession()` | `beginCategorySession()` | `beginMultiSetSession()`
├── Practice by Difficulty → `beginDifficultSet()` | etc. (filtered by selected difficulties)
├── Practice SRS → `beginSrsSets()` | etc. (spaced repetition)
├── Practice Drawing → `beginDrawingMode()` (character tracing)
├── 🏃‍♂️ Sprint Mode → `beginSprintMode()` (5-minute timed session)
├── Start Review → `beginBrowse()` (browse mode with answers visible)
├── View Performance → `viewPerformance()` (analytics dashboard)
└── View Stats/SRS → `viewStats()` | `viewSrs()` (unified data table)
```

## **🔄 Session Interaction Flows**

### **Active Practice Session**
```
PracticeSession Component:
├── Question Display:
│   ├── Chinese character (with language detection)
│   ├── Pinyin (traditional mode only)
│   ├── Progress indicator
│   └── Streak counter & timer (sprint mode)
├── Input & Controls:
│   ├── Answer input field (auto-focus)
│   ├── Submit button (Enter key)
│   ├── 🔊 Audio button (for Chinese text)
│   ├── Focus toggle (🎯 Focus / 👁️ Exit Focus)
│   └── Exit button (high-intensity mode)
└── Answer Processing:
    ├── Client validation + server submission
    ├── Immediate feedback (✓ Correct / ✗ Incorrect + correct answer)
    ├── Streak tracking & best streak memory
    ├── Auto-advance to next question
    └── Session completion detection
```

### **Session Completion Flows**
```
Session Complete → Two Different Experiences:

High-Intensity Completion:
├── Quick Stats: Accuracy percentage + score
├── Knowledge Gaps Analysis:
│   ├── Incorrect answers highlighted
│   ├── "Concepts to Master" section
│   └── 🚀 Quick Reinforcement → `beginReviewIncorrect()`
├── Perfect Session → Celebration + new challenge options
└── Next Actions:
    ├── Continue Practice → `beginAutoSession()`
    └── View Details → Switch to traditional completion

Traditional Completion:
├── Detailed Statistics:
│   ├── Progress bar & percentage
│   ├── KPI grid: Accuracy, Correct, Incorrect, Total
│   └── Incorrect answers table with pinyin
├── Action Options:
│   ├── Restart → Repeat same session
│   ├── Review Incorrect → Local review mode
│   ├── Practice by Difficulty → Filter to challenging cards
│   ├── View Stats → Performance analytics
│   ├── View SRS → Spaced repetition data
│   └── View Performance → Daily analytics
```

## **📊 Data & Analytics Flows**

### **Statistics & Analytics Pathways**
```
Data Views (accessed via buttons or auto-loaded):
├── Unified Stats Table (`UnifiedTable.tsx`):
│   ├── Combined SRS + Statistics data
│   ├── Sortable columns (accuracy, attempts, next review)
│   ├── Filtering by difficulty levels
│   └── Responsive to mode changes (set/category/multi-set)
├── Performance Analytics:
│   ├── Daily performance summaries
│   ├── Session count & question volume
│   ├── Accuracy trends over time
│   └── Study day tracking
└── SRS Management:
    ├── Due cards scheduling
    ├── Easiness factor tracking
    ├── Interval progression
    └── Next review timestamps
```

### **Browse & Review Modes**
```
Browse Mode (`inBrowseMode`):
├── Entry: "Start Review" button
├── Navigation: Arrow keys, PageUp/PageDown
├── Display: Question + Answer (both visible)
├── Audio: TTS support for Chinese characters
├── Controls: Previous/Next buttons
└── Exit: Exit button → returns to selection

Review Incorrect Mode (`inReviewMode`):
├── Entry: "Review Incorrect" or "Quick Reinforcement"
├── Source: Filters wrong answers from completed session
├── Interaction: Same as practice (input required)
├── Progress tracking: Local state management
├── Completion: Returns to selection interface
└── Fallback: Local mode if server unavailable
```

## **🎨 Special Features & Modes**

### **Drawing Mode Flow**
```
Practice Drawing → Drawing Canvas Interface:
├── Character Display: Large character + meaning
├── Canvas Component: Touch/mouse drawing with stroke detection
├── Progress Tracking: Per-character completion + session progress
├── Navigation: Auto-advance on completion
├── Session Management: Separate drawing session state
└── Completion: Return to main interface
```

### **Sprint Mode (5-minute sessions)**
```
🏃‍♂️ Sprint Mode → Timed Practice:
├── Timer: Countdown display (color-coded: green→yellow→red)
├── High-intensity UI: Minimal distractions
├── Question flow: Same as regular practice
├── Time pressure: Visual urgency indicators
├── Auto-completion: Time expiry ends session
└── Results: Time-based performance metrics
```

## **⌨️ Keyboard Shortcuts & Interactions**

### **Global Keyboard Handling**
```
KeyboardHandler Component:
├── 'R' → Repeat audio (Chinese characters only)
├── '1' → Quick start practice (based on current mode/selection)
├── '2' → Practice by difficulty
├── '3' → Practice SRS
├── '4' → Category practice
├── '5' → Category difficulty practice
├── '6' → Category SRS practice
├── Arrow Keys → Browse navigation (browse mode only)
├── Enter → Submit answer (in input fields)
└── Input Detection → Disable shortcuts while typing
```

## **🔧 State Management & Data Flow**

### **Session State Architecture**
```
SessionManager Hook (`useSessionManager`):
├── Core Session Data:
│   ├── sessionId, question, pinyin, progress, results
│   ├── input, lastEval, streak, bestStreak
│   └── Response time tracking (questionStartTime)
├── Mode States:
│   ├── isHighIntensityMode (default: true)
│   ├── inBrowseMode, inReviewMode, inDrawingMode
│   ├── sprintMode, oldFocusMode
│   └── userLevel, focusMode settings
├── Content Selection:
│   ├── sets[], categories[], selectedSet, selectedCategory
│   ├── selectedSets[] (multi-set), mode (set/category/multi-set)
│   └── difficulty filters (diffEasy, diffMedium, diffHard)
└── Data Views:
    ├── showStats, stats, showSrs, srsRows
    ├── showPerformance, performance
    └── Auto-sync with mode/selection changes
```

### **API Integration Points**
```
Backend Communication:
├── Session Management:
│   ├── `POST /api/sessions/start` → Traditional sessions
│   ├── `POST /api/sessions/auto-start` → High-intensity sessions
│   └── `POST /api/sessions/:id/answer` → Answer submission with timing
├── Data Retrieval:
│   ├── `GET /api/sets` → Available flashcard sets
│   ├── `GET /api/categories` → HSK categories
│   ├── `GET /api/stats/set` | `/category` → Performance statistics
│   ├── `GET /api/srs/set` | `/category` → Spaced repetition data
│   └── `GET /api/performance` → Daily analytics
└── Content Management:
    ├── Multi-set aggregation (client-side)
    ├── Pinyin generation (client-side via pinyin-pro)
    └── Audio TTS (browser Web Speech API)
```

## **🚀 Key User Journey Patterns**

### **Efficiency-Focused Learning Path** (Primary)
```
Entry → High-Intensity Mode → Auto-Start → Adaptive Practice → Knowledge Gap Analysis → Reinforcement Loop
```

### **Comprehensive Learning Path** (Advanced Users)
```
Entry → Traditional Mode → Mode Selection → Content Customization → Practice → Analytics Review → Targeted Practice
```

### **Review & Maintenance Path**
```
Entry → Browse Mode → Content Review → Practice Incorrect → SRS Review → Performance Analytics
```

## **📱 User Experience Considerations**

### **Accessibility Features**
- Auto-focus on input fields
- ARIA labels and roles
- Keyboard navigation support
- Audio support for Chinese characters
- Progress indicators with screen reader support

### **Performance Optimizations**
- Lazy loading of pinyin library
- Code splitting for different modes
- Response time tracking for analytics
- Minimal UI in high-intensity mode
- Auto-TTS with Chinese character detection

### **Progressive Enhancement**
- Fallback to local review mode if server unavailable
- Client-side pinyin generation
- Browser-based audio synthesis
- Graceful degradation of advanced features

---

**This comprehensive user flow analysis reveals a sophisticated learning application with multiple pathways optimized for different learning styles and goals, implementing modern spaced repetition principles with extensive customization and analytics capabilities.**
