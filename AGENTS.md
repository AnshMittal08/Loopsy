# Repository Guidelines

## Project Structure & Module Organization

This repository contains two coordinated apps:

- `backend/` is a Next.js 14 API-only server. Route handlers live in `backend/app/api/`, session/auth logic in `backend/lib/auth/`, database models in `backend/lib/models/`, and SQLite setup in `backend/lib/db/`.
- `frontend/` is a React 19 + Vite client. Pages live in `frontend/src/pages/`, reusable UI in `frontend/src/components/`, and shared client helpers in `frontend/src/lib/`.

Phase 2 introduced account-aware flows, so backend and frontend changes now often span auth, API, and UI together.

## Build, Test, and Development Commands

Run commands from the relevant app directory:

- `cd backend && npm install && npm run dev`
- `cd backend && npm run build`
- `cd backend && npm test` — engine test suite (`node:test`, no deps)
- `cd backend && npm run backup` — online SQLite snapshot → `backend/backups/`
- `cd frontend && npm install && npm run dev`
- `cd frontend && npm run build`
- `cd frontend && npm run lint`

If PowerShell blocks `npm.ps1`, use `npm.cmd`.

The deterministic geometry engine lives in `backend/lib/engine/` (gauge,
distribute, shapes, revolve, chart, designSpec, compiler, validator,
colorName). It owns every stitch count — an LLM must never compute them.

## Coding Style & Naming Conventions

- Use 2-space indentation in JSX and route handlers.
- Frontend components/pages use PascalCase filenames such as `Account.jsx` and `TemplateDetail.jsx`.
- Backend utilities, models, and services use camelCase filenames such as `patternService.js` and `sessionModel.js`.
- Keep backend imports on the `@/` alias where configured.
- Prefer functional React components and small context providers for cross-app state such as auth or toasts.

## Design System

The frontend uses the **Atelier** design language: dual theme, warm/tactile, animated. All tokens live in **one** place:

- `frontend/src/index.css` — raw palette variables per theme (`:root` = "Cloud" light, `html[data-theme="dark"]` = "Ink" dark) mapped to Tailwind tokens via the `@theme inline` block. `tailwind.config.js` was removed — never reintroduce a second token source.

**Key tokens** (each flips per theme — always use the Tailwind class, never the hex):
- `primary` — vivid violet (`#6C4CE8` light / `#A78BFF` dark) — buttons, active states
- `secondary` — mint; `tertiary` — rose; `error` — warm red
- `surface` + `surface-container-*` ladder — cool white (light) / violet-tinted charcoal (dark)
- `yarn-coral/marigold/sage/periwinkle/rose` — theme-stable category accents

**Typography:**
- `font-display` → Fraunces (variable serif) — page `<h1>` headings; `display-wonk` animates its SOFT/WONK axes on hover
- `font-headline` / `font-body` → Plus Jakarta Sans — everything else

**Motion:**
- `motion` (Framer Motion successor) with shared tokens in `frontend/src/lib/motionTokens.js` (durations + spring presets)
- Primitives in `frontend/src/components/motion/`: `Reveal`, `Thread`, `YarnBallProgress`, `CursorDot`, `ScrollThread`, `Marquee`; celebrations via `frontend/src/lib/confetti.js`
- Every animation must respect `prefers-reduced-motion` (global kill-switch exists in `index.css`)
- **3D:** two lazy-loaded three.js surfaces — `components/three/YarnBallHero.jsx` (Home hero) and `components/three/Design3DPreview.jsx` (the Design Canvas 3D model). Both must stay behind `React.lazy` so three.js never enters the initial bundle. Don't add more 3D surfaces without a reason.

**Utility classes** (defined in `index.css`):
- `shadow-warm`, `shadow-warm-md/lg/xl` — theme-aware drop shadows
- `card-lift` — lift + shadow on hover; `glass-panel` — translucent blur; `ghost-border`; `shimmer` — skeleton sweep

**Icons:** `lucide-react` only — no icon fonts.

Never use hard-coded hex values in JSX — always use Tailwind color tokens defined in `index.css`.

## Testing & Verification

**The engine has an automated test suite — keep it green.** `cd backend && npm test`
runs `node:test` over `backend/test/`: distribution arithmetic (exhaustive),
every shape/revolve/chart self-validating, the validator flagging wrong counts,
and a regression lock that all 22 seed templates have **0 arithmetic errors**.
**Add a test whenever you touch `lib/engine/`** — it is the product's moat.

CI (`.github/workflows/ci.yml`) runs backend `npm test` + `npm run build` and
frontend `npm test` + `npm run lint` + `npm run build` on every push and PR.

The frontend has a small **`node:test`** suite for its pure logic modules
(`cd frontend && npm test`, zero deps) — covering the stitch-count parser and
the yarn-colour resolver. It does not yet cover React components (that needs
RTL + jsdom). Validate UI changes by:

- Exercising the affected `/api/*` routes locally
- Walking the main flows in the frontend
- `cd frontend && npm run build` + `npm run lint` clean before closing a milestone

Critical manual flows:

- Sign up / sign in / sign out
- Create a template-based, text-AI, and photo (Vision Studio) pattern
- Design Canvas: build/sculpt a creature (live verified badge), draw a chart, generate
- Open tracker, toggle steps, Crochet Mode
- Refresh and confirm the same user still owns the project data
- `/tracker` without a patternId → My Projects list

## Commit & Pull Request Guidelines

Use Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`. PRs should include:

- A short summary
- Affected areas (`backend`, `frontend`, or both)
- Screenshots or recordings for UI changes
- Callouts for DB migrations, auth changes, or API contract updates

## Configuration Notes

- Keep backend on `3000` and frontend on `5173` in local dev.
- SQLite data lives in `backend/data.db` locally. In production the path is controlled by `DB_PATH` env var (Railway: `/data/data.db` on a persistent volume). `backend/lib/db/index.js` calls `fs.mkdirSync` on the parent directory before opening the DB — safe to run in any environment.
- The backend start script is `next start -p ${PORT:-3000}` — binds to Railway's injected `$PORT` in production, falls back to `3000` locally.
- The backend depends on `@anthropic-ai/sdk` when `ANTHROPIC_API_KEY` is used.
- Local account sessions are cookie-based; if auth behaviour looks wrong, verify `/api/me` before debugging the UI.
- Plan upgrades are currently manual DB edits (`UPDATE subscriptions SET plan='maker_pro' WHERE userId=...`). Stripe is not wired yet.
- In production, `frontend/vercel.json` rewrites `/api/*` to the Railway backend URL. Never add `VITE_API_URL` or change frontend fetch paths — the rewrite keeps all calls as relative `/api/...`.
- CORS origin is locked to `process.env.FRONTEND_URL` in production (`backend/next.config.js`). Set `FRONTEND_URL` in Railway env vars after the Vercel URL is known.
