# Frontend — Loopsy Crochet Studio

React 19 + Vite client for Loopsy.

## Responsibilities

- Template discovery, browsing, and detail views
- Account-aware navigation (SideNav, TopNav, MobileNav)
- Sign up / sign in / sign out UI
- Template customization, AI text generation, and **Vision Studio** (photo → editable analysis → pattern) with 429 rate-limit handling
- **Design Canvas** (`/design`): a full-screen editor — *Build* (assemble shapes + Sculpt tool + live 3D model + drag-resize + live "Verified math" badge) and *Draw* (paint a colourwork grid → flat panel or worked-in-the-round medallion)
- Public design share pages at `/d/:id`
- Row-by-row progress tracker with stitch tooltips, winding yarn-ball progress, Crochet Mode focus view
- My Projects list at `/tracker` (no patternId)
- AI Tutor floating chat panel
- Account page: usage bars (incl. Vision trial), upgrade plan cards
- First-run onboarding on the design editors
- Design system: Atelier — dual theme, yarn accents, Fraunces display font, motion animation system

## Design System — "Atelier · Ink & Violet"

**Dual theme** (switched via `html[data-theme]`, persisted by `ThemeToggle`):
- **Ink** (dark): violet-tinted charcoal `#0E0D15` surfaces, soft lavender-white text
- **Cloud** (light): cool white `#F7F7FB` surfaces, ink text
- Primary vivid violet, secondary mint, tertiary rose — each with light/dark variants
- **Yarn accents** (theme-stable, used per category): coral `#FF6584`, marigold `#FFB02E`, sage/mint `#4ECBA0`, periwinkle/violet `#8B7CF6`, rose `#F472B6`
- **Aurora wash** — faint violet/rose/mint radial glows behind every page (`--aurora-strength`)
- Film-grain overlay (`body::before`) so surfaces feel like fabric

**Fonts:** Fraunces (variable serif display, `font-display`) + Plus Jakarta Sans (body)

**Motion:** [`motion`](https://motion.dev) with shared tokens in `src/lib/motionTokens.js`; primitives in `src/components/motion/`; all animation respects `prefers-reduced-motion`. App-wide signatures: custom cursor follower (`CursorDot`), yarn-gradient scroll progress (`ScrollThread`), editorial marquee (`Marquee`).

**3D:** two lazy-loaded three.js surfaces — the yarn-ball hero on Home (`src/components/three/YarnBallHero.jsx`) and the Design Canvas 3D model (`src/components/three/Design3DPreview.jsx`, which lathes sculpt profiles into real geometry). Both code-split into their own chunks and never touch the initial bundle. Don't add more 3D surfaces without reason.

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
| `src/components/motion/CursorDot.jsx` | Custom cursor follower (fine pointers only) |
| `src/components/motion/ScrollThread.jsx` | Yarn-gradient scroll progress thread |
| `src/components/motion/Marquee.jsx` | Editorial looping word strip |
| `src/components/three/YarnBallHero.jsx` | Lazy-loaded 3D yarn ball (Home hero) |
| `src/components/three/Design3DPreview.jsx` | Lazy-loaded live 3D model of a Build design |
| `src/lib/motionTokens.js` | Shared motion durations + spring presets |
| `src/lib/confetti.js` | Yarn-confetti celebration bursts |
| `src/components/AuthProvider.jsx` | `useAuth()` — user, signIn, signUp, signOut |
| `src/components/SideNav.jsx` | Desktop sidebar with logo + nav items |
| `src/components/MobileNav.jsx` | Portal-rendered slide-in drawer |
| `src/components/AiTutor.jsx` | Floating step-specific Q&A panel |
| `src/components/VisionStudio.jsx` | Photo upload → editable analysis (M3) |
| `src/components/CanvasStage.jsx` | Build-mode SVG canvas: drag/resize/sculpt parts |
| `src/components/CrochetMode.jsx` | Full-screen focus tracker view |
| `src/components/ColorPicker.jsx` | Yarn swatches + unlimited custom colours |
| `src/components/OnboardingCard.jsx` | Dismissible first-run editor guide |
| `src/pages/Home.jsx` | Discovery + beginner path + recent patterns |
| `src/pages/Create.jsx` | Template / text-AI / photo (Vision Studio) generation |
| `src/pages/Design.jsx` | Design Canvas — Build mode + 2D/3D + live verified feedback |
| `src/pages/ChartStudio.jsx` | Design Canvas — Draw mode (colourwork chart / medallion) |
| `src/pages/DesignShare.jsx` | Public `/d/:id` share page |
| `src/pages/Tracker.jsx` | Progress tracking + My Projects list |
| `src/lib/shapeKit.js`, `assembly.js`, `buildTemplates.js`, `chartPresets.js` | Design-canvas shape kit, layout-derived assembly, creature + chart templates |
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
