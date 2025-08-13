# HSK Flashcards Web App

A spaced repetition system (SRS) for learning Chinese characters using HSK vocabulary.

## Architecture

- **Frontend**: Vite + React TypeScript app (`frontend/`)
- **Backend**: Cloudflare Worker with Hono framework (`backend/`)
- **Database**: Cloudflare D1 (SQLite)
- **Data**: HSK flashcard sets in CSV format (`Recognition_Practice/`)

## Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

## Deployment

The app is deployed at `game.fasttakeoff.org` via Cloudflare Workers.

```bash
# Build frontend
cd frontend && npm run build

# Deploy backend (includes frontend assets)
cd backend && npm run deploy
```

## Database Setup

```bash
cd backend
npm run migrate
npm run seed:hsk1
```