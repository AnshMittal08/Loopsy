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
- `cd frontend && npm install && npm run dev`
- `cd frontend && npm run build`
- `cd frontend && npm run lint`

If PowerShell blocks `npm.ps1`, use `npm.cmd`.

## Coding Style & Naming Conventions

- Use 2-space indentation in JSX and route handlers.
- Frontend components/pages use PascalCase filenames such as `Account.jsx` and `TemplateDetail.jsx`.
- Backend utilities, models, and services use camelCase filenames such as `patternService.js` and `sessionModel.js`.
- Keep backend imports on the `@/` alias where configured.
- Prefer functional React components and small context providers for cross-app state such as auth or toasts.

## Design System

The frontend uses the **Atelier** design language: dual theme, warm/tactile, animated. All tokens live in **one** place:

- `frontend/src/index.css` — raw palette variables per theme (`:root` = "Undyed" light, `html[data-theme="dark"]` = "Midnight Wool" dark) mapped to Tailwind tokens via the `@theme inline` block. `tailwind.config.js` was removed — never reintroduce a second token source.

**Key tokens** (each flips per theme — always use the Tailwind class, never the hex):
- `primary` — terracotta coral (`#C2410C` light / `#FF7A50` dark) — buttons, active states
- `secondary` — sage; `tertiary` — periwinkle; `error` — warm red
- `surface` + `surface-container-*` ladder — warm cream (light) / warm charcoal (dark)
- `yarn-coral/marigold/sage/periwinkle/rose` — theme-stable category accents

**Typography:**
- `font-display` → Fraunces (variable serif) — page `<h1>` headings; `display-wonk` animates its SOFT/WONK axes on hover
- `font-headline` / `font-body` → Plus Jakarta Sans — everything else

**Motion:**
- `motion` (Framer Motion successor) with shared tokens in `frontend/src/lib/motionTokens.js` (durations + spring presets)
- Primitives in `frontend/src/components/motion/`: `Reveal`, `Thread`, `YarnBallProgress`, `CursorDot`, `ScrollThread`, `Marquee`; celebrations via `frontend/src/lib/confetti.js`
- Every animation must respect `prefers-reduced-motion` (global kill-switch exists in `index.css`)
- **3D:** exactly one three.js surface exists — the lazy-loaded `frontend/src/components/three/YarnBallHero.jsx` on Home. Keep it the only one, and keep it behind `React.lazy` so three.js never enters the initial bundle.

**Utility classes** (defined in `index.css`):
- `shadow-warm`, `shadow-warm-md/lg/xl` — theme-aware drop shadows
- `card-lift` — lift + shadow on hover; `glass-panel` — translucent blur; `ghost-border`; `shimmer` — skeleton sweep

**Icons:** `lucide-react` only — no icon fonts.

Never use hard-coded hex values in JSX — always use Tailwind color tokens defined in `index.css`.

## Testing & Verification

There is no committed automated test suite. Validate changes by:

- Exercising the affected `/api/*` routes locally
- Walking the main flows in the frontend
- Running `cd frontend && npm run build` — zero errors required before closing any milestone

Current critical manual flows:

- Sign up / sign in / sign out
- Create a template-based pattern
- Generate an AI pattern
- Open tracker and toggle steps
- Refresh and confirm the same user still owns the project data
- Hit `/tracker` without a patternId — should show My Projects list

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
