# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

### Backend
```bash
cd backend
npm install
npm run dev
npm run build
npm test          # engine test suite (node:test) — the "verified math" guard
npm run backup    # online SQLite backup → backend/backups/
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
- `lib/models/` - SQLite queries for templates, patterns, progress, designs, users, sessions
- `lib/services/` - AI generation and template-to-pattern business logic
- `lib/engine/` - the deterministic geometry engine. Stitch counts are **computed, never guessed**:
  - `gauge.js` - stitches/rows per cm by yarn weight + hook
  - `distribute.js` - even increase/decrease distribution for any delta across a round (exhaustively tested)
  - `shapes.js` - shape generators (sphere, ellipsoid, hemisphere, tube, cone, flatPanel, hatCrown, grannySquare)
  - `revolve.js` - profile curve → amigurumi worked in rounds (the "Sculpt" engine)
  - `chart.js` - colourwork: `compileChart` (flat rows) + `compileMedallion` (worked in the round)
  - `colorName.js` - map any hex to a readable yarn name for patterns
  - `designSpec.js` - the Design Spec schema (normalize + validate)
  - `compiler.js` - Design Spec → ordered steps with computed counts
  - `validator.js` - independently re-derives counts; earns the "Verified math ✓" badge
- `lib/logger.js` - structured logger (JSON in prod, readable in dev)
- `lib/db/index.js` - SQLite singleton, schema init, idempotent migrations
- `test/` - `node:test` engine suite; CI (`.github/workflows/ci.yml`) runs it on every push/PR

## Key Design Decisions

1. SQLite persists templates, patterns, progress, users, subscriptions, and sessions.
2. Templates are seeded automatically on first startup.
3. Local auth is cookie-based, not OAuth-based yet.
4. `patterns` and `progress` are now scoped by `userId`.
5. Most creation/tracker routes require authentication.
6. AI generation uses Claude when `ANTHROPIC_API_KEY` is set and falls back to Ollama otherwise. When all providers fail the route returns an honest `AI_UNAVAILABLE` error (it never saves the static fallback as a "ready" pattern or charges quota).
7. AI generation is compiler-first (M2): Claude Haiku parses intent into a Design Spec, `lib/engine` computes exact stitch counts, Claude Sonnet humanizes the presentation. Freeform fallback is labeled experimental; the `verified` flag on patterns is set only when the validator proves the math.
8. **Vision Studio (M3)**: photos → confidence-scored Design Spec (Claude vision) → editable chips → the same compiler. `analyze-image` is the metered step (free = 1 lifetime trial). Images are passed through, never stored.
9. **Design Canvas (M4)**: a free-form designer at `/design`. *Build* mode assembles primitive shapes + a *Sculpt* tool (revolve) and shows a live 3D preview; *Draw* mode paints a colour grid compiled flat or as a worked-in-the-round medallion. The canvas produces a Design Spec → the same engine. Designs persist in the `designs` table and share via `/d/:id`.
10. The Design Spec is the single contract every front door (text, photo, canvas) produces; the engine owns all arithmetic. Never let an LLM compute stitch counts.

## Auth Surface

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

Frontend auth state is managed by `frontend/src/components/AuthProvider.jsx`.

### Auth & request hardening (P0)

- **Login/signup throttling** — DB-backed rolling-window counters in the
  `rate_limits` table via `lib/models/rateLimitModel.js` (`peek/hit/clear`).
  Login: 5 failed attempts per (ip,email) and 20 per ip / 15 min; a successful
  sign-in clears the account bucket. Signup: 10 per ip / hour. Same 401 message
  whether or not the account exists (no enumeration).
- **CSRF defense-in-depth** — `lib/auth/request.js` `isCrossSiteRequest()` checks
  the `Origin`/`Referer` against `allowedOrigins()` on auth POSTs. It complements
  (does not replace) the `SameSite=Lax` session cookie, and fails open only when
  no allowlist can be determined (misconfigured `FRONTEND_URL`).
- **Security headers** — backend API responses set nosniff / frame-deny /
  referrer-policy / permissions-policy / HSTS (`next.config.js`); CORS no longer
  falls back to `*` (requires `FRONTEND_URL` in prod, emits credentialed CORS
  only for that origin). The SPA sets a strict **CSP** + the same headers in
  `frontend/vercel.json`; the theme bootstrap is an external `public/theme-init.js`
  so `script-src` stays `'self'` (no `unsafe-inline`).
- **Config validation** — `lib/config.js` `validateConfig()` runs at DB init and
  logs loudly when required prod env (`FRONTEND_URL`) is missing.

## Main Routes

| Route | Purpose |
|------|---------|
| `/` | discovery, beginner path, recent creations |
| `/account` | sign up, sign in, sign out, current plan summary |
| `/templates/:templateId` | template detail view |
| `/create/:templateId?` | template customization, AI text + photo (Vision Studio) generation |
| `/design` | Design Canvas — Build (shapes + Sculpt + 3D) / Draw (colourwork chart + medallion) |
| `/d/:id` | public read-only design share page |
| `/tracker/:patternId?` | progress tracker (no id → My Projects) |

## Key API routes (beyond auth)

| Route | Purpose |
|------|---------|
| `POST /api/ai/generate-pattern` | text → verified pattern (streaming SSE) |
| `POST /api/ai/regenerate` | regenerate a pattern |
| `POST /api/ai/analyze-image` | Vision Studio: photo → Design Spec (metered) |
| `POST /api/ai/generate-from-spec` | compile an approved/canvas spec (streaming) |
| `POST /api/ai/generate-chart` | colourwork grid → flat or medallion pattern |
| `POST /api/design/preview` | live, no-save compile summary for the canvas |
| `GET/POST /api/designs`, `GET/PATCH /api/designs/:id` | persist + link + share designs |
| `GET /api/designs/:id/og` | auto-generated Open Graph image (SVG) |

## Database Notes

Important tables now include:

- `users`
- `subscriptions`
- `sessions`
- `templates`
- `patterns` with `userId`, `verified`, `isExperimental`
- `progress` with `userId`
- `designs` (canvas spec JSON + linked `patternId`, for revisiting/sharing)
- `ai_usage` (per-user monthly + lifetime usage; powers rate limits and the vision trial)
- `rate_limits` (rolling-window counters for auth throttling; keyed by an opaque `bucket`)
- `analytics`

When adding new persistent product features, prefer incremental `ALTER TABLE` migrations inside `backend/lib/db/index.js`. **Make migrations idempotent** (swallow "duplicate column" errors) — Next build collects page data across parallel workers that all init the same DB.

## Testing

- `cd backend && npm test` runs the engine suite (`node:test`, zero deps). It locks the moat: distribution math, every shape/revolve/chart self-validating, the validator flagging wrong counts, and a regression lock that all 22 seed templates have 0 arithmetic errors.
- CI (`.github/workflows/ci.yml`) runs backend tests + build and frontend lint + build on every push and PR. Keep it green.
- The engine is pure and deterministic — add a test when you touch `lib/engine/`.

## Extension Guidance

- Add new authenticated routes by reusing `requireAuthenticatedUser()` from `backend/lib/auth/session.js`.
- Add new account-aware UI by reading `useAuth()` from `frontend/src/components/AuthProvider.jsx`.
- Keep future subscription logic centralized; do not scatter entitlement checks through unrelated route files.
