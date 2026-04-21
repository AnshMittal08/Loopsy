# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

### Backend (Next.js API)
```bash
cd backend
npm install
npm run dev      # Start API server on port 3000
npm run build    # Production build check
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev      # Start dev server on port 5173
npm run build    # Production build
npm run lint     # Run ESLint
```

Both servers must run simultaneously. The Vite dev server proxies `/api/*` to `http://localhost:3000`.

## Architecture

**Monorepo structure:**
- `backend/` — Next.js 14 App Router, API-only (no UI pages)
- `frontend/` — React 19 + Vite + React Router DOM + Tailwind CSS v4

**Data flow:**
```
Frontend (5173) → Vite proxy → Next.js API (3000) → SQLite (data.db)
```

**Backend layers:**
- `app/api/` — HTTP route handlers (Next.js App Router)
- `lib/services/` — Business logic (`aiService.js`, `patternService.js`)
- `lib/models/` — SQLite queries (`patternModel.js`, `progressModel.js`, `templateModel.js`)
- `lib/db/index.js` — SQLite singleton via `globalThis.__crochetDb`; initializes tables and runs migrations on startup

**Key design decisions:**
1. **SQLite persistence** — `backend/data.db` stores patterns, progress, and templates. File persists across restarts. Delete it to reset to a clean seed state.
2. **Template seeding** — `templateModel.js` seeds 22 templates into SQLite on first startup (when the templates table is empty). No runtime dependency on `lib/data/templates.json`.
3. **Port pinning** — Backend must be 3000, frontend must be 5173 (set in `vite.config.js`).
4. **CORS** — Handled in `next.config.js` for all `/api/*` routes.
5. **Atomic step toggle** — `progressModel.toggleStepAtomic()` wraps the read-modify-write in an exclusive SQLite transaction to prevent race conditions when steps are tapped rapidly.
6. **Idempotent progress init** — `POST /api/progress` returns the existing progress record if one already exists for the pattern, preventing accidental reset on refresh.

## AI Generation

`lib/services/aiService.js` checks for `ANTHROPIC_API_KEY` at runtime:

- **If set** → uses `claude-sonnet-4-6` via `@anthropic-ai/sdk` with structured tool_use output (guaranteed JSON schema, full metadata, no abbreviations)
- **If not set** → falls back to local Ollama at `http://localhost:11434` with model `phi3`
- **If both fail** → returns a labeled fallback practice pattern (`isFallback: true`)

Set the key in a `.env.local` file in the backend directory:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | All templates (summary, no `defaultPattern`) |
| `GET` | `/api/templates/:id` | Single template with full `defaultPattern` |
| `GET` | `/api/patterns` | All created patterns |
| `GET` | `/api/patterns/:id` | Single pattern with full step details |
| `POST` | `/api/patterns` | Create pattern from template + customization `{ templateId, title, customization: { color, size } }` |
| `POST` | `/api/ai/generate-pattern` | AI generation `{ prompt, difficulty }` |
| `POST` | `/api/progress` | Initialize or retrieve existing progress for a pattern `{ patternId }` |
| `GET` | `/api/progress/pattern/:patternId` | All progress records for a pattern |
| `PATCH` | `/api/progress/:id` | Toggle a step `{ stepIndex }` |

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home.jsx` | Hero + template library with search/filter |
| `/create/:templateId?` | `Create.jsx` | Template customization or AI generation |
| `/tracker/:patternId` | `Tracker.jsx` | Step-by-step progress tracker |

## Frontend Components & Utilities

| File | Purpose |
|------|---------|
| `components/SideNav.jsx` | Sidebar navigation |
| `components/TopNav.jsx` | Top navigation bar |
| `lib/patternThemes.js` | Maps category → `{ accent, orb, panel, icon }` design tokens |
| `lib/crochetAbbreviations.js` | `expandAbbreviations(text)` — expands crochet shorthand to plain English in step instructions |

## Database Schema

**templates** — 22 seeded entries, created on first startup
```
id, name, description, difficulty, category, tags, imageUrl,
hookSize, yarnWeight, timeEstimate, finishedSize, materials, notes, defaultPattern, createdAt
```

**patterns** — user-created patterns
```
id, title, templateId, color, size, steps, difficulty, category, tags, materials,
hookSize, yarnWeight, timeEstimate, finishedSize, notes, promptSummary, isAIGenerated, isFallback, createdAt
```

**progress** — row-by-row completion state
```
id, patternId, totalSteps, steps (JSON), progressPercentage, createdAt
```

## Extending

- **Add endpoint:** Create `backend/app/api/your-route/route.js` following existing patterns
- **Add page:** Create `frontend/src/pages/*.jsx`, add route in `App.jsx`, link in `SideNav.jsx`
- **Add templates:** Edit `TEMPLATE_SEED` array in `backend/lib/models/templateModel.js`; delete `backend/data.db` to re-seed
- **Add database column:** Add `ALTER TABLE` migration in `lib/db/index.js` alongside existing migration checks
