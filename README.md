# StitchFlow AI

StitchFlow AI is a crochet project studio with two core flows:

- Explore curated crochet templates with searchable metadata such as difficulty, category, yarn weight, hook size, time estimate, and tags.
- Generate custom patterns from either a template or an AI prompt, then track row-by-row progress in the browser.

The repository is a small two-app monorepo:

```text
frontend/   React 19 + Vite + React Router + Tailwind CSS v4
backend/    Next.js 14 API routes + SQLite + better-sqlite3
```

## Current Product Scope

- Discovery page with category and difficulty filters
- Template customization flow
- AI pattern generation through a local Ollama instance
- Persistent pattern and progress storage in `backend/data.db`
- Tracker view with progress, materials, notes, tags, and AI/fallback labels

## Local Development

Prerequisites:

- Node.js 18+
- npm 9+
- Ollama installed locally if you want AI generation

Start Ollama in a separate terminal:

```bash
ollama run phi3
```

Run the backend:

```bash
cd backend
npm install
npm run dev
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

The Vite dev server proxies `/api/*` requests to the backend, so frontend code should keep using relative API paths such as `fetch('/api/templates')`.

## Useful Commands

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd backend && npm run build
```

There is no committed automated test suite yet. Right now, linting plus production builds are the main verification steps.

## API Surface

Implemented API routes:

- `GET /api/templates`
- `GET /api/templates/:id`
- `GET /api/patterns`
- `GET /api/patterns/:id`
- `POST /api/patterns`
- `POST /api/ai/generate-pattern`
- `POST /api/ai/regenerate`
- `POST /api/progress`
- `GET /api/progress/pattern/:patternId`
- `GET /api/progress/:id`
- `PATCH /api/progress/:id`

## Data Notes

- SQLite is initialized automatically by [backend/lib/db/index.js](D:\Crochet\backend\lib\db\index.js).
- Pattern records now store crochet metadata in addition to steps: `category`, `tags`, `materials`, `hookSize`, `yarnWeight`, `timeEstimate`, `finishedSize`, `notes`, and AI flags.
- AI generation falls back to a clearly labeled practice pattern if Ollama is unavailable or returns invalid JSON.

## Known Gaps

- No authentication or user accounts
- No saved collections or favorites
- No automated API/UI tests yet
- AI generation still depends on a local Ollama process and uses heuristic metadata enrichment
