# Frontend — Loopsy Crochet Studio

React 19 + Vite client for Loopsy.

## Responsibilities

- Template discovery, browsing, and detail views
- Account-aware navigation (SideNav, TopNav, MobileNav)
- Sign up / sign in / sign out UI
- Template customization and AI generation UI with 429 rate-limit handling
- Row-by-row progress tracker with stitch tooltips, winding yarn-ball progress, Crochet Mode focus view
- My Projects list at `/tracker` (no patternId)
- AI Tutor floating chat panel
- Account page: usage bars, upgrade plan cards
- Design system: Atelier — dual theme, yarn accents, Fraunces display font, motion animation system

## Design System — "Atelier"

**Dual theme** (switched via `html[data-theme]`, persisted by `ThemeToggle`):
- **Midnight Wool** (dark): deep warm charcoal `#16120E` surfaces, soft cream text
- **Undyed** (light): warm oatmeal `#FAF5EC` surfaces, espresso text
- Primary terracotta coral, secondary sage, tertiary periwinkle — each with light/dark variants
- **Yarn accents** (theme-stable, used per category): coral `#FF6B5B`, marigold `#F5A623`, sage `#7FA37A`, periwinkle `#7B8CDE`, rose `#E8728C`
- Film-grain overlay (`body::before`) so surfaces feel like fabric

**Fonts:** Fraunces (variable serif display, `font-display`) + Plus Jakarta Sans (body)

**Motion:** [`motion`](https://motion.dev) with shared tokens in `src/lib/motionTokens.js`; primitives in `src/components/motion/`; all animation respects `prefers-reduced-motion`

**Icons:** `lucide-react` (tree-shakeable SVG — no icon font)

**Tokens live in one place:**
- `src/index.css` — Tailwind v4 `@theme` block (`tailwind.config.js` was removed; never reintroduce a second token source)

## Important Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Route definitions |
| `src/index.css` | Atelier design system — theme tokens, grain, utilities |
| `src/components/ThemeToggle.jsx` | Midnight Wool ↔ Undyed switch (persists to localStorage) |
| `src/components/motion/Reveal.jsx` | Scroll/mount entrance animation primitive |
| `src/components/motion/Thread.jsx` | Self-drawing SVG yarn-thread motif |
| `src/components/motion/YarnBallProgress.jsx` | Winding yarn-ball progress indicator |
| `src/lib/motionTokens.js` | Shared motion durations + spring presets |
| `src/lib/confetti.js` | Yarn-confetti celebration bursts |
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
- In production (Vercel), `vercel.json` rewrites `/api/*` to the Railway backend — no `VITE_API_URL` env var needed, all fetch calls stay as relative `/api/...` paths.
