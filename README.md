# Loopsy — Crochet Studio

Loopsy is a full-featured crochet project studio for discovering patterns, generating custom designs with AI, and tracking row-by-row progress while you work.

```
frontend/   React 19 + Vite + React Router + Tailwind CSS v4
backend/    Next.js 14 API routes + SQLite (better-sqlite3)
```

---

## Features

### Accounts
- Sign up / sign in with email and password
- Cookie-based sessions (30-day TTL, `HttpOnly`, `SameSite=Strict`)
- Patterns and progress are scoped to the authenticated user
- Free plan on signup; subscription tiers ready for billing

### Discovery
- Browse 22 curated templates across Wearable, Amigurumi, Accessory, Blanket, and Home Decor categories
- Filter by category and difficulty (Beginner / Intermediate / Advanced)
- Full-text search across name, description, and tags
- Template cards with real crochet product photos and card-lift hover effect
- "Start Here" beginner path: 6 curated projects in learning progression

### Template Detail
- Full-width hero image, metadata grid (hook, yarn, time, size), materials, and maker notes
- Read-only pattern steps with all abbreviations expanded to plain English
- "Customize This Pattern" CTA → `/create/:id`

### AI Pattern Generation
- Describe what you want to make in plain English
- **Compiler-first pipeline** (when `ANTHROPIC_API_KEY` is set): Claude Haiku parses intent into a Design Spec → the deterministic Pattern Compiler computes exact rounds → Claude Sonnet writes the friendly presentation around the engine's numbers
- Freeform Claude generation as fallback for designs outside the compiler vocabulary — labeled **experimental**, verified only if the validator can prove the math
- Falls back to local **Ollama** (phi3) if no API key is configured
- **Streaming generation** — the endpoint streams server-sent events (pipeline stage, each computed row, final pattern) so the Create page's generation theater shows real progress, not a simulation
- Always returns a usable pattern — clearly labeled fallback if AI is unavailable
- Prompt caching (`cache_control: ephemeral`) on all Claude calls — ~90% cost reduction on repeated system-prompt tokens

### Vision Studio — photo → pattern (M3)
- Snap or upload up to 3 photos of a finished crochet item; Claude vision (Sonnet) decomposes it into the **same Design Spec** the text path produces
- Returns a **confidence-scored, plain-English readout** ("bee amigurumi · ~6 cm · worked in rounds") shown as **editable chips** — correct the size, parts, or colors *before* compiling, so the math comes out right
- The approved spec compiles through the **exact M2 engine** (compile → validate → humanize) and earns the same "Verified math ✓" badge — vision adds zero new arithmetic
- `POST /api/ai/analyze-image` (the metered vision call) → `POST /api/ai/generate-from-spec` (deterministic, streamed). Images are passed through to Claude, never stored
- Trial gating: Free gets **1 lifetime vision trial**, Maker Pro spends a monthly generation, Creator is unlimited. AI output is labeled personal-use-only

### Design Canvas — design anything, get verified stitches (M4)
A dedicated full-screen editor at `/design` with two construction systems:

- **Build (3D amigurumi)** — assemble primitive shapes (Ball, Egg, Tube, Cone, Dome, Panel) on a canvas; **drag to move, grab a corner handle to resize**. A **Sculpt** tool lets you draw *any* silhouette by dragging control points — it revolves into a real 3D form. A **2D/3D toggle** shows a live, rotatable three.js model (sculpt profiles lathe into actual geometry). Start from creature templates (Teddy, Bunny, Cat, Snowman, Chick).
- **Draw (2D / round colourwork)** — paint any picture on a pixel grid; each square is one stitch. Make it a **flat panel** (worked in rows — blankets, appliqués) or a **Round 3D medallion** (worked in the round into a disc/dome — shields, badges, mandalas; the drawing is sampled ring-by-ring). Templates include a validated **Captain America shield**.
- **Live "Verified math ✓" feedback** while you design (debounced `POST /api/design/preview`) — the stitch count updates as you move/resize.
- **Unlimited colours** — yarn swatches plus a custom colour picker; any hex is named for the written pattern (e.g. "3 burnt orange, 2 teal").
- **Layout-derived assembly** — the engine reads where parts sit and writes "Sew the Head to the top of the Body, about 8 cm from its center."
- Designs persist (`designs` table) and **share** via a public `/d/:id` page with an auto-generated Open Graph image.

### Pattern Compiler — "Verified math ✓" (M2)
- Deterministic crochet geometry engine in `backend/lib/engine/` — stitch counts are **computed, never guessed**
- **Gauge tables** by yarn weight (with tight amigurumi tension variants) drive every dimension→stitch conversion
- **Shape generators**: `sphere`, `ellipsoid`, `hemisphere`, `tube`, `cone`, `flatPanel`, `hatCrown` (head-size tables), `grannySquare` — each emits textbook increase/decrease distributions (a 6 cm amigurumi sphere always produces the 6-12-18-24-30… sequence)
- **`distribute.js`** — even increase/decrease distribution for *any* delta across a round (exhaustively tested), so **`revolve.js`** can turn an arbitrary profile curve into exact rounds (the Sculpt engine)
- **`chart.js`** — colourwork: each grid square is one stitch, worked flat (`compileChart`) or in the round (`compileMedallion`)
- **Design Spec** — the one JSON contract every front door produces (text prompt, photo, and the design canvas)
- **Validator** re-derives running stitch counts from any pattern's text and flags drift; it skips conventions it can't model rather than guessing
- The **"Verified math ✓" badge** is earned, not given: shown only when every checkable count agrees
- Audit the seed templates anytime: `cd backend && node scripts/validate-templates.js`

### Quality — tests, CI, observability
- **Engine test suite** (`cd backend && npm test`, `node:test`, zero deps): exhaustive distribution arithmetic, every shape/revolve/chart self-validating, the validator catching wrong counts, and a regression lock that all 22 templates have 0 arithmetic errors
- **CI** (`.github/workflows/ci.yml`) runs backend tests + build and frontend lint + build on every push and PR
- Structured logger (`backend/lib/logger.js`); online DB backup (`npm run backup`)

### Template Customization
- Pick any template, set yarn colour and size (small / medium / large)
- Stitch counts scale automatically; colour prefix applied to every step

### Progress Tracker
- Row-by-row checkbox tracker with an animated **winding yarn-ball progress indicator** — thread wraps around the ball as rows complete
- **Crochet Mode** — full-screen focus view: huge type, dimmed chrome, tap/space to advance, screen wake-lock
- Milestone celebrations at 25/50/75/100% (confetti + encouragement)
- Stitch term tooltips with YouTube tutorial links (hover/tap on any stitch name)
- Step instructions in plain English — all crochet abbreviations expanded
- Materials list and maker notes visible while you crochet
- Template photo displayed as the left panel hero image
- Progress persists in SQLite — survives page refresh and server restart
- Atomic step toggle prevents race conditions
- `/tracker` without a patternId shows a "My Projects" list of all user patterns

### AI Tutor
- Floating "Ask tutor" button in the tracker (bottom-right, portal-rendered)
- Step-specific Q&A: Claude receives the full pattern and current step as context
- Conversation history maintained for the session
- Three suggested starter questions on first open
- Graceful 503 if no `ANTHROPIC_API_KEY` is set
- Rate-limited per plan (free: 3/month, Maker Pro: unlimited)

### Subscription Plans + Rate Limiting
- Per-user AI usage tracked in SQLite (`ai_usage` table), resets automatically each calendar month
- Three tiers: **Free** (3 generations, 3 tutor questions/month), **Maker Pro** (30 gen, unlimited tutor), **Creator** (unlimited both)
- 429 responses include `code: "RATE_LIMIT_EXCEEDED"` with used/limit/plan — Create page links to `/account` on rate limit hit
- `GET /api/usage` returns live usage counts and plan limits
- Account page shows animated progress bars ("X of Y used this month") and upgrade cards (coming soon)

### Design System — "Atelier"
- **Dual theme**: **Ink** (dark — violet-tinted charcoal `#0E0D15`, lavender-white text) and **Cloud** (light — cool white `#F7F7FB`, ink text), toggled via `ThemeToggle` (`html[data-theme]`)
- **Yarn accent palette** used semantically per category: coral, marigold, sage, periwinkle, rose
- Subtle film-grain texture overlay so surfaces feel like fabric, not glass
- **Fraunces** serif display font (variable axes) + **Plus Jakarta Sans** body text
- **Motion system** built on [`motion`](https://motion.dev): shared motion tokens (`src/lib/motionTokens.js`), `Reveal`/`Thread`/`YarnBallProgress` primitives, confetti celebrations — all respecting `prefers-reduced-motion`
- **lucide-react** SVG icons (the Material Symbols icon font was dropped)
- Tokens live in a single source of truth: the Tailwind v4 `@theme` block in `frontend/src/index.css` (`tailwind.config.js` was removed)

---

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+
- Ollama (optional) — only needed if you don't set an Anthropic API key

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Create `backend/.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

`ANTHROPIC_API_KEY` is optional. Without it the app falls back to local Ollama:

```bash
ollama run phi3
```

Optional environment variables:

| Variable | Where | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | backend | Claude AI — falls back to Ollama without it |
| `DB_PATH` | backend | SQLite file path — defaults to `backend/data.db` |
| `FRONTEND_URL` | backend | Restricts CORS to this origin in production |

Sessions use a random secret generated at runtime.

### 3. Run both servers

Terminal 1 — Backend:
```bash
cd backend
npm run dev
```

Terminal 2 — Frontend:
```bash
cd frontend
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |

The Vite dev server proxies all `/api/*` requests to the backend automatically.

### First startup

On first run the backend creates `backend/data.db` and seeds all 22 templates automatically. No manual migration needed.

To reset to a clean state (removes all accounts, patterns, and progress):
```bash
rm backend/data.db
```

---

## Project Structure

```
Loopsy/
├── backend/
│   ├── app/api/
│   │   ├── auth/
│   │   │   ├── signup/          POST — create account
│   │   │   ├── login/           POST — sign in
│   │   │   └── logout/          POST — sign out, clear cookie
│   │   ├── me/                  GET — current session user
│   │   ├── ai/
│   │   │   ├── generate-pattern/  POST — text → verified pattern (streaming)
│   │   │   ├── regenerate/        POST — regenerate a pattern
│   │   │   ├── analyze-image/     POST — Vision Studio: photo → Design Spec (M3)
│   │   │   ├── generate-from-spec/ POST — compile an approved/canvas spec (streaming)
│   │   │   ├── generate-chart/    POST — colourwork grid → flat or medallion (M4)
│   │   │   └── tutor/             POST — step-specific AI Q&A (Claude)
│   │   ├── design/preview/      POST — live, no-save compile summary for the canvas
│   │   ├── designs/             GET/POST designs; [id] GET/PATCH; [id]/og GET (OG image)
│   │   ├── usage/               GET — AI usage + plan limits + vision trial
│   │   ├── patterns/, progress/, templates/, analytics/   (as before)
│   ├── lib/
│   │   ├── auth/session.js      password hashing, cookie sessions
│   │   ├── db/index.js          SQLite singleton, schema init, idempotent migrations
│   │   ├── logger.js            structured logger (JSON in prod)
│   │   ├── engine/              deterministic crochet geometry — computes every stitch
│   │   │   ├── gauge.js         gauge tables by yarn weight
│   │   │   ├── distribute.js    even inc/dec distribution for any delta (exhaustively tested)
│   │   │   ├── shapes.js        sphere/ellipsoid/hemisphere/tube/cone/flatPanel/hatCrown/grannySquare
│   │   │   ├── revolve.js       profile curve → amigurumi in rounds (Sculpt engine)
│   │   │   ├── chart.js         colourwork: compileChart (flat) + compileMedallion (round)
│   │   │   ├── colorName.js     any hex → readable yarn name
│   │   │   ├── designSpec.js    Design Spec schema — normalize + validate
│   │   │   ├── compiler.js      Spec → ordered steps with computed counts
│   │   │   └── validator.js     re-derives counts, earns the Verified-math badge
│   │   ├── models/             user, session, template (22 seed), pattern, progress, design, usage
│   │   ├── services/           aiService (compiler-first + vision), patternService
│   │   └── utils/planLimits.js  PLAN_LIMITS, checkRateLimit, checkVisionAccess
│   ├── scripts/                validate-templates.js, backup-db.js
│   ├── test/                   node:test engine suite (npm test)
│   └── data.db                  SQLite database (auto-created, gitignored)
│
├── .github/workflows/ci.yml    backend tests+build, frontend lint+build
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx         discovery + beginner path + recent patterns
│   │   │   ├── Account.jsx      auth + usage bars (incl. vision trial) + upgrade cards
│   │   │   ├── TemplateDetail.jsx  full template view with CTA
│   │   │   ├── Create.jsx       template / text-AI / photo (Vision Studio) generation
│   │   │   ├── Design.jsx       Design Canvas — Build mode + 2D/3D + live verified feedback
│   │   │   ├── ChartStudio.jsx  Design Canvas — Draw mode (chart / medallion)
│   │   │   ├── DesignShare.jsx  public /d/:id share page
│   │   │   └── Tracker.jsx      row-by-row progress tracker + My Projects list
│   │   ├── components/
│   │   │   ├── AuthProvider.jsx useAuth() hook — user, signIn, signUp, signOut
│   │   │   ├── AiTutor.jsx      Floating chat panel — step-specific Claude Q&A
│   │   │   ├── MobileNav.jsx    Portal-rendered slide-in drawer
│   │   │   ├── StitchTooltip.jsx  Stitch term overlay with YouTube links
│   │   │   ├── Skeleton.jsx     Loading skeleton components
│   │   │   ├── ThemeToggle.jsx  Midnight Wool ↔ Undyed theme switch
│   │   │   ├── Toast.jsx        Toast notification system
│   │   │   ├── TopNav.jsx       Desktop top navigation bar
│   │   │   ├── SideNav.jsx      Desktop side navigation
│   │   │   └── motion/
│   │   │       ├── Reveal.jsx          Scroll/mount entrance animations
│   │   │       ├── Thread.jsx          Self-drawing SVG yarn thread motif
│   │   │       └── YarnBallProgress.jsx  Winding yarn-ball progress indicator
│   │   └── lib/
│   │       ├── motionTokens.js       Shared durations + spring presets
│   │       ├── confetti.js           Yarn-confetti celebration bursts
│   │       ├── patternThemes.js      Category → colour/icon design tokens
│   │       └── crochetAbbreviations.js  Plain-English expander + stitch metadata
│   ├── index.css               Tailwind v4 @theme — Atelier tokens (single source of truth) + utilities
│   └── vite.config.js
│
├── CLAUDE.md                    Claude Code developer guidance
├── plan.md                      Original roadmap (historical)
├── plan-v2.md                   Active roadmap — milestones M1–M6
├── vision.md                    Product vision and market analysis
└── README.md
```

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | `{ name, email, password }` | Create account, set session cookie |
| `POST` | `/api/auth/login` | `{ email, password }` | Sign in, set session cookie |
| `POST` | `/api/auth/logout` | — | Clear session cookie |
| `GET` | `/api/me` | — | Current authenticated user or `null` |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | All templates (summary — no `defaultPattern`). Query: `?difficulty=&category=&q=` |
| `GET` | `/api/templates/:id` | Full template including `defaultPattern` |

### Patterns (user-scoped, requires auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patterns` | All patterns for the current user |
| `GET` | `/api/patterns/:id` | Single pattern with full steps |
| `POST` | `/api/patterns` | Create from template `{ templateId, title, customization: { color, size } }` |
| `DELETE` | `/api/patterns/:id` | Delete pattern and its progress records |
| `POST` | `/api/ai/generate-pattern` | AI generation `{ prompt, difficulty }` — rate-limited |
| `POST` | `/api/ai/regenerate` | Re-generate a pattern `{ prompt, difficulty }` — rate-limited |
| `POST` | `/api/ai/tutor` | Step-specific Q&A `{ patternId, currentStepIndex, userMessage, history }` — rate-limited |
| `GET` | `/api/usage` | Current user's AI usage and plan limits |

### Progress (user-scoped, requires auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/progress` | Init or return existing progress `{ patternId }` |
| `GET` | `/api/progress/pattern/:patternId` | All progress records for a pattern |
| `PATCH` | `/api/progress/:id` | Toggle step `{ stepIndex }` (atomic) |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics` | Usage stats: pattern counts, AI usage, template count, avg completion |

---

## Database Schema

**users**
```sql
id, email, name, passwordHash, createdAt
```

**sessions**
```sql
id, userId, token, createdAt, expiresAt
```

**subscriptions**
```sql
id, userId, plan, status, createdAt, updatedAt
```

**templates** — seeded on first startup
```sql
id, name, description, difficulty, category, tags, imageUrl,
hookSize, yarnWeight, timeEstimate, finishedSize, materials, notes, defaultPattern, createdAt
```

**patterns** — user-created, scoped by userId
```sql
id, userId, title, templateId, color, size, steps, difficulty, category, tags, materials,
hookSize, yarnWeight, timeEstimate, finishedSize, notes, promptSummary, isAIGenerated, isFallback,
verified, isExperimental, createdAt
```

**progress** — scoped by userId
```sql
id, userId, patternId, totalSteps, steps (JSON array), progressPercentage, createdAt
```

**ai_usage** — per-user monthly AI usage counters
```sql
id, userId, type (generation|tutor), month (YYYY-MM), count, createdAt, updatedAt
UNIQUE(userId, type, month)
```

---

## Useful Commands

```bash
# Lint frontend
cd frontend && npm run lint

# Production builds
cd frontend && npm run build
cd backend && npm run build

# Reset database (re-seeds all 22 templates, removes all accounts and patterns)
rm backend/data.db
```

---

## Roadmap

See [plan-v2.md](./plan-v2.md) for the active roadmap ([plan.md](./plan.md) is kept for history). Shipped so far:

- Phase 1 — Core tracker, AI generation, template library, SQLite backend
- Phase 1.5 — Stitch tooltips, beginner path, mobile nav, skeletons, toasts, template detail page
- Phase 2A — Local auth with cookie sessions, user-scoped patterns and progress
- Phase 2B — AI Tutor in tracker, DB performance indexes, form validation, accessibility fixes
- Phase 2C — Per-plan AI rate limiting, monthly usage tracking, prompt caching, Account usage UI
- Phase 2D (UI) — UI/UX redesign: Frozen Lake design system, Fraunces serif, card-lift components, all pages rebuilt
- **M1 — "Glow-Up"** — Atelier design language: dual theme (Midnight Wool / Undyed), yarn accent palette, `motion` animation system, thread motif, winding yarn-ball tracker, Crochet Mode, lucide icons, three.js/dead-code removal
- **M2 — "The Compiler"** — deterministic crochet geometry engine (`backend/lib/engine/`): gauge tables, shape generators, Design Spec schema, pattern compiler, validator + "Verified math ✓" badge; AI generation rewired to intent→compile→humanize with streaming SSE responses; plus an app-wide animation/interactivity polish pass (route transitions, magnetic CTAs, 3D-tilt cards, theatrical generation view) and the home redesign: lazy-loaded three.js yarn-ball hero (the one 3D moment plan-v2 reserves), custom cursor follower, scroll-progress thread, editorial marquee + footer

- **M3 — "Vision Studio"** — photo → confidence-scored editable analysis → verified pattern; lifetime trial gating; honest AI-outage handling
- **M4 — "Design Canvas"** — free-form designer at `/design`: Build (shapes + Sculpt + live 3D + drag-resize), Draw (colourwork chart + worked-in-the-round medallion), unlimited colours, layout-derived assembly, live verified-math feedback, public share pages + OG images
- **Hardening** — engine test suite + CI (the verified-math moat), structured logging, DB backups, first-run onboarding, component decomposition

Next milestones (plan-v2):

1. **M5 — "Get Paid"** — Stripe billing, PDF export, PWA (plans are still manual DB edits until then)
2. **M6 — "The Flywheel"** — public share pages, creator seeding, Learn page, Crochet-Alongs

Known gaps (honest): Vision Studio needs a live `ANTHROPIC_API_KEY` to validate end-to-end; OG link-preview meta is client-injected (needs SSR for non-JS crawlers); the editors are desktop-first; tailored garments are out of scope (no accurate auto-grading).

## Deployment

Production stack: **Vercel** (frontend) + **Railway** (backend + SQLite persistent volume).

### Environment variables

**Railway (backend):**
```
ANTHROPIC_API_KEY=sk-ant-...
DB_PATH=/data/data.db
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

**Vercel (frontend):** none — API calls are proxied via `frontend/vercel.json` rewrites to the Railway backend URL.

### Key production config files
- `frontend/vercel.json` — rewrites `/api/*` → Railway backend
- `backend/package.json` — start script uses `${PORT:-3000}` to bind Railway's injected `$PORT`
- `backend/lib/db/index.js` — reads `DB_PATH` env var; creates parent directory automatically on startup
