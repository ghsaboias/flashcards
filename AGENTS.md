# Repository Guidelines

## Project Structure & Module Organization
`frontend/` holds the Vite + React TypeScript client, with session logic in `src/components`, reusable hooks in `src/hooks`, utilities in `src/utils`, and generated bundles in `dist/` (never edit by hand). `backend/` hosts the Cloudflare Worker entrypoints (`src/worker.ts`) plus Durable Object coordination in `src/sessions-do.ts`, shared SRS helpers in `src/srs.ts`, and the D1 schema files (`schema.sql`, `seed-hsk1.sql`). Shared vocabulary data lives at `hsk30-expanded.csv`; keep large datasets derived from it out of version control unless curated.

## Build, Test, and Development Commands
Use Bun in each workspace: `cd frontend && bun install` and `cd backend && bun install` to sync dependencies. During UI work run `bunx vite` inside `frontend/` for the dev server, and finish by `bunx tsc -b && bunx vite build` before pushing. For the Worker, `bunx wrangler dev` starts a local tunnel, `bunx wrangler deploy` publishes to Cloudflare, and `bunx wrangler d1 migrations apply flashcards` keeps the D1 instance in sync. Apply schema or seed data with `bunx wrangler d1 execute flashcards --file ./schema.sql` or `--file ./seed-hsk1.sql`.

## Coding Style & Naming Conventions
Favor strict, typed APIs: keep TypeScript's `strict` mode green, prefer explicit return types for exported functions, and keep shared shapes in `backend/src/types.ts`. Follow the project's two-space indentation, single quotes, and descriptive PascalCase component names (`HighIntensityMode.tsx`). Run `bunx eslint .` in the frontend before submitting, and mirror that style in Worker code.

## Testing Guidelines
Automated tests are not yet wired up; flag that gap during reviews. When adding coverage, colocate Vitest suites alongside modules (`frontend/src/components/__tests__/Component.test.tsx`) and exercise core session flows plus D1 access functions. Until the suite exists, smoke-test the SPA via the Vite dev server and validate Worker endpoints with `curl` against `wrangler dev`. Do not ship regressions without manual verification notes.

## Commit & Pull Request Guidelines
History follows Conventional Commits (`feat:`, `fix:`, `chore:`). Write present-tense summaries under 72 characters and group related changes per commit. PRs must include: scope overview, testing notes (commands run, manual checks), linked issue or task, and screenshots/GIFs for UI changes. Keep branches up to date with main before requesting review.

## Security & Configuration Tips
Secrets and environment bindings stay out of Git; configure them via `wrangler.toml` and Cloudflare dashboard variables. Migrations are source-controlled—never edit production tables manually. When working with CSV imports, script transformations instead of committing ad-hoc spreadsheet exports.
