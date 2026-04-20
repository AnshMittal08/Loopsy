# Repository Guidelines

## Project Structure & Module Organization
This repository is split into two independent Node apps:

- `backend/` contains the Next.js 14 API-only server. Route handlers live in `backend/app/api/`, shared business logic in `backend/lib/services/`, persistence in `backend/lib/models/` and `backend/lib/db/`, and seed data in `backend/lib/data/`.
- `frontend/` contains the React 19 + Vite client. Pages live in `frontend/src/pages/`, reusable UI in `frontend/src/components/`, and static assets in `frontend/public/` and `frontend/src/assets/`.

Keep backend and frontend changes scoped to their app unless the feature requires coordinated API/UI updates.

## Build, Test, and Development Commands
Run commands from the relevant app directory:

- `cd backend && npm run dev` starts the API server on `http://localhost:3000`.
- `cd backend && npm run build` creates the production backend build.
- `cd frontend && npm run dev` starts the Vite app on `http://localhost:5173`.
- `cd frontend && npm run build` creates the production frontend bundle.
- `cd frontend && npm run lint` runs ESLint on `src/`.

For full local development, run both servers. The frontend proxies `/api/*` to the backend through `frontend/vite.config.js`.

## Coding Style & Naming Conventions
Follow the existing style in each app:

- Use 2-space indentation in JSX and route handlers.
- Frontend components and pages use PascalCase file names, for example `TopNav.jsx` and `Create.jsx`.
- Backend utility, model, and service files use camelCase names, for example `patternService.js`.
- Prefer functional React components, relative imports in the frontend, and `@/` imports in the backend where already configured.
- Use `npm run lint` in `frontend/` before opening a PR. No backend formatter or linter is configured yet.

## Testing Guidelines
There is currently no committed automated test suite. Until one is added:

- Validate backend changes by exercising the affected `/api/*` routes locally.
- Validate frontend changes through the main flows: template browsing, pattern creation, and tracker updates.
- When adding tests, place them beside the feature or under a dedicated `__tests__/` folder and use `*.test.*` naming.

## Commit & Pull Request Guidelines
Git history currently uses Conventional Commit style, for example `feat: initial commit - Loopsy Crochet AI Designer MVP`. Continue with prefixes like `feat:`, `fix:`, and `docs:`.

PRs should include a short summary, affected areas (`backend`, `frontend`, or both), linked issues when applicable, and screenshots or short recordings for UI changes. Call out any API contract or database changes explicitly.

## Configuration Notes
Keep the default ports aligned with the current setup: backend `3000`, frontend `5173`. Backend data is stored in `backend/data.db`; do not commit local data changes unless the schema itself changed.
