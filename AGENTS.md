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

## Testing & Verification
There is still no committed automated test suite. Validate changes by:

- exercising the affected `/api/*` routes locally
- walking the main flows in the frontend
- running `frontend` lint and both production builds before closing a milestone

Current critical manual flows:

- sign up / sign in / sign out
- create a template-based pattern
- generate an AI pattern
- open tracker and toggle steps
- refresh and confirm the same user still owns the project data

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes such as `feat:`, `fix:`, and `docs:`. PRs should include:

- a short summary
- affected areas (`backend`, `frontend`, or both)
- screenshots or recordings for UI changes
- callouts for DB migrations, auth changes, or API contract updates

## Configuration Notes

- Keep backend on `3000` and frontend on `5173`.
- SQLite data lives in `backend/data.db`.
- The backend now depends on `@anthropic-ai/sdk` when `ANTHROPIC_API_KEY` is used.
- Local account sessions are cookie-based; if auth behaviour looks wrong, verify `/api/me` before debugging the UI.
