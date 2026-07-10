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
  - `shapes.js` - shape generators (sphere, ellipsoid, hemisphere, tube, cone, flatPanel, hatCrown, grannySquare; E1: flatCircle, flatHexagon, taperedTube, triangle, star, heart; E2: splitLimbBody — legs-first continuous amigurumi construction)
  - `garments.js` - E3 sized garments (raglanSweater top-down, sock toe-up with afterthought heel, mitten with peasant thumb; keyword sizes baby→adult-xl); raglan increase rounds and chain-over openings are validator-derived idioms
  - `texture.js` - E2 count-neutral stitch textures (bobble, popcorn, shell, ribbing) rewriting a shape's plain even rounds; the validator derives the texture idioms exactly, so textured parts keep the "Verified math ✓" badge
  - `revolve.js` - profile curve → amigurumi worked in rounds (the "Sculpt" engine)
  - `chart.js` - colourwork: `compileChart` (flat rows) + `compileMedallion` (worked in the round)
  - `colorName.js` - map any hex to a readable yarn name for patterns
  - `yardage.js` - yarn-amount estimation from generated stitch counts (per-stitch length calibrated to gauge; texture/chain factors; 15% buffer); the compiler emits per-colour "about X m (Y g)" materials lines + a `yardage` summary
  - `designSpec.js` - the Design Spec schema (normalize + validate); a part may carry an optional `colorPlan` (`{ colors, stripeRounds }`) for stripes and an optional `texture` (`bobble | popcorn | shell | ribbing`)
  - `compiler.js` - Design Spec → ordered steps with computed counts; stripes are emitted as count-less "Change to … yarn" notes + relabelled round ranges, so stitch math (and the validator) is unaffected
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

- `POST /api/auth/signup` (sends an email-verification link)
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/verify-email` (consume token → mark verified)
- `POST /api/auth/forgot-password` (generic response; emails a reset link)
- `POST /api/auth/reset-password` (consume token → set new password)
- `POST /api/auth/magic-link` / `POST /api/auth/magic-login` (passwordless email sign-in; 15-min single-use token)
- `GET /api/auth/google` + `GET /api/auth/google/callback` (OAuth code flow; identities in `user_identities`, linking only on provider-verified emails — see `lib/models/authProviderModel.js`)
- `GET /api/auth/providers` (which optional auth features are live + Turnstile site key)
- `GET /api/me`

Frontend auth state is managed by `frontend/src/components/AuthProvider.jsx`.

### Auth & request hardening (P0)

- **Bot protection** — Cloudflare Turnstile on signup, magic-link and
  forgot-password (`lib/auth/turnstile.js`); dormant without `TURNSTILE_SECRET_KEY`,
  fail-closed with it.
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
- **Email verification & password reset** — single-use, hashed, expiring tokens
  in `email_tokens` via `lib/models/emailTokenModel.js`; delivery through a
  provider-agnostic `lib/email/mailer.js` (logs the link with no provider; sends
  via Resend when `RESEND_API_KEY` is set — set `EMAIL_FROM` too). `users.emailVerified`
  tracks state. Frontend landing pages: `/verify-email`, `/reset-password`.
- **Soft delete + audit** — destructive/privileged actions append to `audit_log`
  via `lib/models/auditModel.js`; `patterns`/`designs` carry `deletedAt` and reads
  filter it out (pattern delete is now a soft delete, recoverable).
- The session cookie is `loopsy_session`; the legacy `stitchflow_session` is still
  read and cleared so the rename doesn't sign anyone out.

## Main Routes

| Route | Purpose |
|------|---------|
| `/` | discovery, beginner path, recent creations |
| `/account` | sign up, sign in, sign out, current plan summary |
| `/templates/:templateId` | template detail view |
| `/create/:templateId?` | template customization, AI text + photo (Vision Studio) generation |
| `/design` | Design Canvas — Build (shapes + Sculpt + 3D) / Draw (colourwork chart + medallion) |
| `/d/:id` | public read-only design share page |
| `/tracker/:patternId?` | progress tracker (no id → My Projects; publish toggle per project) |
| `/community` | community feed of published patterns (Recent / Trending sort) |
| `/p/:id` | public read-only pattern page (star, save-to-collection) |
| `/u/:handle` | public creator profile (their published patterns + stats) |
| `/library` | the signed-in user's collections (saved-pattern groups) |
| `/learn` | Learning Centre — guided beginner path, technique guides, stitch glossary |
| `/learn/:slug` | a single technique guide article |

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
| `GET /api/community?sort=recent\|trending` | paginated public pattern feed (+ caller's starred set) |
| `PATCH /api/patterns/:id` | publish/unpublish toggle (owner) |
| `POST /api/patterns/:id/star` | toggle a star on a published pattern |
| `GET /api/patterns/:id/public` | public read-only pattern detail |
| `GET /api/users/:handle` | public creator profile + their published patterns |
| `GET/POST /api/collections`, `GET/DELETE /api/collections/:id`, `POST /api/collections/:id/patterns` | collections CRUD + membership |
| `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook` | Stripe checkout, billing portal, webhook |

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
- `audit_log` (append-only trail of privileged/destructive actions)
- `email_tokens` (single-use hashed tokens for email verification + password reset)
- `users.emailVerified`, `patterns.deletedAt`, `designs.deletedAt`, `users.deletedAt` (added via idempotent migrations)
- `notifications` (in-app star/comment notifications; bell menu)
- `error_log` (captured unhandled API errors; powers the admin errors panel)
- `analytics`

Account lifecycle (GDPR): `GET /api/account/export` returns a portable JSON of everything held; `POST /api/account/delete` (re-verifies password + `confirm: "DELETE"`) hard-deletes private rows, anonymizes comments, takes published patterns down, and scrubs+tombstones the user (email freed, `deletedAt` set) — see `lib/models/accountModel.js`.

When adding new persistent product features, prefer incremental `ALTER TABLE` migrations inside `backend/lib/db/index.js`. **Make migrations idempotent** (swallow "duplicate column" errors) — Next build collects page data across parallel workers that all init the same DB.

### Dual-driver schema changes (SQLite + Postgres)

Every schema change must land in **three** places or it breaks one driver:
1. `backend/lib/db/index.js` — idempotent `ALTER TABLE` for the boot-time SQLite path.
2. `backend/migrations/000N_*.sql` — a new idempotent file for Postgres (`ADD COLUMN IF NOT EXISTS`); `npm run migrate` applies all files in order.
3. `PG_KEYMAP` in `lib/db/index.js` — add a `lowercase: 'camelCase'` entry for any new camelCase column (Postgres folds unquoted identifiers to lowercase).

### Ops runbook — keep it current

`docs/devops/DEPLOYMENT.md` is the living source of truth for everything that must change on the live servers (Railway env, Neon migrations, Stripe/Resend config, Vercel). **Any change that needs a new env var, a migration, or other server-side action MUST be recorded under "Pending deploy actions" in that file in the same commit** — this is part of "done". Move items to "Applied history" once deployed.

## Testing

- `cd backend && npm test` runs the engine suite (`node:test`, zero deps). It locks the moat: distribution math, every shape/revolve/chart self-validating, the validator flagging wrong counts, and a regression lock that all 22 seed templates have 0 arithmetic errors.
- **Independent accuracy audit** (`test/accuracyAudit.test.js` + `test/helpers/independentVerifier.js`): a SECOND checker that shares no code with `validator.js`. It expands each instruction into atomic crochet operations from first principles and enforces the two physical laws — every round consumes exactly the previous round's stitches (feasibility) and the printed `(N stitches)` equals what those operations produce (honesty) — across a wide parameter sweep of every generator, garment, texture, revolve profile, and full compiler spec (~7,000 rounds, ~95% independently proven, 0 violations). The remainder (granny-cluster corner rounds, produce-only foundation rows) are non-tileable by construction. A coverage floor fails the suite if a future change hides a regression behind a skip.
- CI (`.github/workflows/ci.yml`) runs backend tests + build and frontend lint + build on every push and PR. Keep it green.
- The engine is pure and deterministic — add a test when you touch `lib/engine/`.

## Extension Guidance

- Add new authenticated routes by reusing `requireAuthenticatedUser()` from `backend/lib/auth/session.js`.
- Add new account-aware UI by reading `useAuth()` from `frontend/src/components/AuthProvider.jsx`.
- Keep future subscription logic centralized; do not scatter entitlement checks through unrelated route files.
