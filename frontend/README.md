# Frontend — Loopsy Crochet Studio

React 19 + Vite client for Loopsy.

## Responsibilities

- Template discovery, browsing, and detail views
- Account-aware navigation (SideNav, TopNav, MobileNav)
- Sign up / sign in / sign out UI
- Template customization and AI generation UI with 429 rate-limit handling
- Row-by-row progress tracker with stitch tooltips and animated progress ring
- My Projects list at `/tracker` (no patternId)
- AI Tutor floating chat panel
- Account page: usage bars, upgrade plan cards
- Design system: Frozen Lake palette, Fraunces display font, card-lift components

## Design System

**Frozen Lake palette:**
- Primary: `#1E40AF` (navy)
- Secondary: `#4E6878` (slate)
- Tertiary: `#B45309` (warm amber)
- Surface: `#F6F9FF` (blue-white)
- Text: `#0A1428` (deep navy-black)

**Fonts:** Fraunces (serif display, `font-display`) + Plus Jakarta Sans (body)

**Tokens live in:**
- `src/index.css` — Tailwind v4 `@theme` CSS variables
- `tailwind.config.js` — color + font extensions

## Important Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Route definitions |
| `src/index.css` | Design system — color tokens, shadow utilities, card-lift |
| `tailwind.config.js` | Frozen Lake color palette + font families |
| `src/components/AuthProvider.jsx` | `useAuth()` — user, signIn, signUp, signOut |
| `src/components/SideNav.jsx` | Desktop sidebar with logo + nav items |
| `src/components/TopNav.jsx` | Top bar for non-sidebar pages |
| `src/components/MobileNav.jsx` | Portal-rendered slide-in drawer |
| `src/components/AiTutor.jsx` | Floating step-specific Q&A panel |
| `src/pages/Home.jsx` | Discovery + beginner path + recent patterns |
| `src/pages/Account.jsx` | Auth form + usage bars + upgrade cards |
| `src/pages/Create.jsx` | AI generation + template customization |
| `src/pages/Tracker.jsx` | Progress tracking + My Projects list |
| `src/pages/TemplateDetail.jsx` | Full template detail with CTA |
| `src/lib/patternThemes.js` | Category → gradient/icon design tokens |
| `src/lib/crochetAbbreviations.js` | Stitch expander + YouTube tutorial links |
| `vercel.json` | Production API rewrite — proxies `/api/*` to Railway backend |

## Commands

```bash
npm run dev
npm run build
npm run lint
```

If PowerShell blocks `npm`, use `npm.cmd`.

## Notes

- Frontend proxies all `/api/*` to the backend via Vite config.
- Auth state is fetched from `/api/me` by `AuthProvider`.
- Pattern creation and tracking require sign-in — all data is user-scoped.
- `/api/usage` is fetched on Account page mount to show monthly usage bars.
- AI generation returns `429 { code: "RATE_LIMIT_EXCEEDED" }` when plan limit hit; Create page shows "View plans →" link to `/account`.
- The `PaletteSwitcher` component in `src/components/PaletteSwitcher.jsx` was used for palette preview during design — it is not wired into `App.jsx` in production.
- In production (Vercel), `vercel.json` rewrites `/api/*` to the Railway backend — no `VITE_API_URL` env var needed, all fetch calls stay as relative `/api/...` paths.
