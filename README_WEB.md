Web version quickstart

Backend (FastAPI)

- Install deps: `uv sync`
- Run API: `uv run uvicorn api.main:app --reload --port 8000`

Frontend (Vite + React)

- Create app: `npm create vite@latest web -- --template react-ts`
- cd web && npm install && npm install axios
- Start dev: `npm run dev`

Configure CORS as needed. The API exposes:

- GET /health
- GET /sets, GET /categories
- GET /sets/{set}/cards
- POST /sessions/start { mode, set_name?, category?, selected_sets?, selected_categories? }
- GET /sessions/{id}
- POST /sessions/{id}/answer { session_id, answer }
