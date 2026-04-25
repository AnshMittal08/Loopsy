# Frontend App

This is the React 19 + Vite client for StitchFlow AI.

## Current Responsibilities

- discovery and template browsing
- account-aware navigation
- local sign-up / sign-in / sign-out UI
- template customization and AI generation UI
- tracker UI with stitch tooltips, materials, notes, and progress ring

## Important Files

- `src/App.jsx` - route definitions
- `src/components/AuthProvider.jsx` - frontend session state
- `src/components/TopNav.jsx`, `SideNav.jsx`, `MobileNav.jsx` - navigation
- `src/pages/Home.jsx` - discovery
- `src/pages/Account.jsx` - auth entry point
- `src/pages/Create.jsx` - pattern creation
- `src/pages/Tracker.jsx` - progress tracking
- `src/pages/TemplateDetail.jsx` - template details

## Commands

```bash
npm run dev
npm run build
npm run lint
```

If PowerShell blocks `npm`, use `npm.cmd`.

## Notes

- The frontend expects the backend API at `/api/*` through the Vite proxy.
- Auth state is fetched from `/api/me`.
- Project creation and tracking flows are now gated behind sign-in because patterns and progress are user-scoped in Phase 2.
