# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

### Backend
```bash
cd backend
npm install
npm run dev
npm run build
```

### Frontend
```bash
cd frontend
npm install
npm run dev
npm run build
npm run lint
```

If PowerShell blocks `npm`, use `npm.cmd`.

## Architecture

**Monorepo structure**
- `backend/` - Next.js 14 App Router, API-only
- `frontend/` - React 19 + Vite + React Router + Tailwind CSS v4

**Data flow**
```text
Frontend (5173) -> Vite proxy -> Next.js API (3000) -> SQLite (data.db)
```

## Backend Layers

- `app/api/` - route handlers
- `lib/auth/` - password hashing, cookie sessions, auth helpers
- `lib/models/` - SQLite queries for templates, patterns, progress, users, sessions
- `lib/services/` - AI generation and template-to-pattern business logic
- `lib/engine/` - Pattern Compiler (M2): gauge tables, shape generators, Design Spec schema, compiler, validator — stitch counts are computed, never guessed
- `lib/db/index.js` - SQLite singleton, schema init, migrations

## Key Design Decisions

1. SQLite persists templates, patterns, progress, users, subscriptions, and sessions.
2. Templates are seeded automatically on first startup.
3. Local auth is cookie-based, not OAuth-based yet.
4. `patterns` and `progress` are now scoped by `userId`.
5. Most creation/tracker routes require authentication.
6. AI generation uses Claude when `ANTHROPIC_API_KEY` is set and falls back to Ollama otherwise.
7. AI generation is compiler-first (M2): Claude Haiku parses intent into a Design Spec, `lib/engine` computes exact stitch counts, Claude Sonnet humanizes the presentation. Freeform fallback is labeled experimental; the `verified` flag on patterns is set only when the validator proves the math.

## Auth Surface

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

Frontend auth state is managed by `frontend/src/components/AuthProvider.jsx`.

## Main Routes

| Route | Purpose |
|------|---------|
| `/` | discovery, beginner path, recent creations |
| `/account` | sign up, sign in, sign out, current plan summary |
| `/templates/:templateId` | template detail view |
| `/create/:templateId?` | template customization or AI generation |
| `/tracker/:patternId` | progress tracker |

## Database Notes

Important tables now include:

- `users`
- `subscriptions`
- `sessions`
- `templates`
- `patterns` with `userId`
- `progress` with `userId`
- `analytics`

When adding new persistent product features in Phase 2, prefer incremental `ALTER TABLE` migrations inside `backend/lib/db/index.js`.

## Extension Guidance

- Add new authenticated routes by reusing `requireAuthenticatedUser()` from `backend/lib/auth/session.js`.
- Add new account-aware UI by reading `useAuth()` from `frontend/src/components/AuthProvider.jsx`.
- Keep future subscription logic centralized; do not scatter entitlement checks through unrelated route files.
