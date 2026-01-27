# Flashcards

Spaced repetition flashcards app built on Cloudflare Workers + D1.

## Features

- SM-2 spaced repetition algorithm
- 5 country decks: capitals, flags, languages, currencies, regions
- Card flip animation UI
- Mobile-friendly dark theme

## Setup

```bash
npm install
npx wrangler d1 create flashcards-db  # update database_id in wrangler.toml
npm run db:init:local
npm run fetch:countries
npm run seed:local
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run fetch:countries` | Fetch country data from API |
| `npm run seed:local` | Seed local database |
| `npm run seed` | Seed remote database |

## Tech

- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless runtime
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - SQLite database
- [SM-2 Algorithm](https://en.wikipedia.org/wiki/SuperMemo#SM-2_algorithm) - Spaced repetition
