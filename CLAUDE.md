# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Next.js API)
```bash
cd backend
npm run dev      # Start API server on port 3000
npm run build    # Build for production
```

### Frontend (React + Vite)
```bash
cd frontend
npm run dev      # Start dev server on port 5173
npm run build    # Build for production
npm run lint     # Run ESLint
```

Both servers must run simultaneously. The Vite dev server proxies `/api/*` to `http://localhost:3000`.

## Architecture

**Monorepo structure** with two independent apps:
- `backend/` — Next.js 14 App Router, API-only (no UI pages)
- `frontend/` — React 19 + Vite + React Router DOM

**Data Flow:**
```
Frontend (5173) → Vite proxy → Next.js API (3000) → In-memory models
```

**Backend layers:**
- `/api/*` routes in `backend/app/api/` handle HTTP
- `lib/services/` contains business logic (e.g., `patternService.generatePattern`)
- `lib/models/` are in-memory stores using `globalThis` for state sharing across route modules

**Key design choices:**
1. **In-memory state** — `globalThis.__patterns` and `globalThis.__progressRecords` reset on server restart (MVP intentional)
2. **Port pinning** — Backend must be 3000, frontend must be 5173 (configured in `vite.config.js`)
3. **CORS** — Handled in `next.config.js` headers for all `/api/*` routes
4. **No database** — Data lives in module-level arrays; replace `lib/models/*.js` to add persistence

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | List all templates (summary, no `defaultPattern`) |
| `GET` | `/api/patterns` | List all created patterns |
| `GET` | `/api/patterns/:id` | Get single pattern with full details |
| `POST` | `/api/patterns` | Create pattern from template + customization |
| `GET` | `/api/progress/pattern/:patternId` | Get progress records for a pattern |
| `POST` | `/api/progress` | Initialize progress tracking |
| `PATCH` | `/api/progress/:id` | Update step completion status |

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home.jsx` | Hero + template gallery |
| `/create/:templateId?` | `Create.jsx` | Pattern generator (AI + template-based) |
| `/tracker/:patternId` | `Tracker.jsx` | Step-by-step progress tracker |

## Extending

- **Add endpoint:** Create `backend/app/api/your-route/route.js` following existing route patterns
- **Add page:** Create `frontend/src/pages/*.jsx`, add route in `App.jsx`, link in `SideNav.jsx`
- **Add database:** Swap in-memory models in `lib/models/` for ORM calls; service layer abstracts this already
- **AI generation:** The Create page already calls `/api/ai/generate-pattern` — implement this endpoint to enable AI pattern generation
