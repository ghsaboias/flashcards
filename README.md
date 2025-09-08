# HSK Flashcards Web App

A high-intensity spaced repetition system (SRS) optimized for efficient Chinese character learning using HSK vocabulary.

## 🚀 Efficient Learning Features

### **High-Intensity Mode (Default)**
- **Single-click start**: Auto-detects optimal practice content
- **Streamlined interface**: Minimal distractions for maximum focus
- **20+ questions per 30 minutes**: Target exercise density for efficient learning

### **Adaptive Learning System**
- **Progressive unlocks**: Master fundamentals before advancing (70-85% accuracy gates)
- **Smart feedback timing**: Duration adapts to question difficulty and response speed
- **Knowledge gap focus**: Completion emphasizes struggling concepts over statistics

### **Systematic Progression**
- **Breadth-first learning**: Complete foundational layers before complexity
- **Memory anchoring**: Immediate re-testing of incorrect answers
- **SRS integration**: Automatic scheduling based on performance data

## Architecture

- **Frontend**: Vite + React TypeScript app with lazy-loaded components (`frontend/`)
- **Backend**: Cloudflare Worker with Hono framework + Durable Objects (`backend/`)
- **Database**: Cloudflare D1 (SQLite) with progressive unlock logic
- **Data**: HSK Level 1 vocabulary (150+ characters across 10 sets)

## 🎯 Learning Principles

This app implements **efficient learning principles** for systematic knowledge acquisition:

### **Active vs. Passive Learning**
- Maximizes exercise time over information consumption
- Immediate practice follows each information exposure
- Eliminates "spectator mentality" of passive review

### **Bite-sized Learning Cycles**
- Small, digestible content chunks with tight feedback loops
- 2-6 second adaptive feedback based on difficulty and response time
- Prevents cognitive overload while maintaining challenge

### **Memory Anchoring Strategy**
- Establishes foundational "anchors" before building complexity
- Spaced repetition on key primitives with performance tracking
- Progressive unlock system ensures systematic knowledge building

## Quick Start

```bash
# Build frontend + start backend server
cd frontend && npm run build
cd ../backend && npm run dev
# Visit http://localhost:8787
```

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev      # Vite dev server (optional, for HMR)
npm run build    # Production build with optimizations
npm run lint     # ESLint (maintain 0 warnings)
```

### Backend Development  
```bash
cd backend
npm install
npm run dev      # Cloudflare Worker dev server
npm run deploy   # Deploy to production
npm run migrate  # Run database migrations
```

## Deployment

**Live App**: https://game.fasttakeoff.org

```bash
# Production deployment
cd frontend && npm run build
cd ../backend && npm run deploy
```

## Performance Metrics

- **Bundle Size**: 222KB main + 302KB lazy-loaded pinyin
- **Build Time**: <1 second
- **Target Density**: 20+ exercises per 30-minute session
- **Progressive Gates**: 70-85% accuracy required for advancement