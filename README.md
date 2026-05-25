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
- Uses **Claude** (`claude-sonnet-4-6`) when `ANTHROPIC_API_KEY` is set — structured tool_use output, full metadata, no abbreviations
- Falls back to local **Ollama** (phi3) if no API key is configured
- Always returns a usable pattern — clearly labeled fallback if AI is unavailable
- Prompt caching (`cache_control: ephemeral`) on all Claude calls — ~90% cost reduction on repeated system-prompt tokens

### Template Customization
- Pick any template, set yarn colour and size (small / medium / large)
- Stitch counts scale automatically; colour prefix applied to every step

### Progress Tracker
- Row-by-row checkbox tracker with animated SVG progress ring (navy blue)
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

### Design System
- **Frozen Lake palette** — navy `#1E40AF` primary, slate `#4E6878` secondary, warm amber `#B45309` tertiary, crisp blue-white surfaces
- **Fraunces** serif display font + **Plus Jakarta Sans** body text
- White cards with subtle border and shadow on a light blue-white background
- Consistent `rounded-2xl` cards, `rounded-full` CTAs, `card-lift` hover effect

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
│   │   │   ├── generate-pattern/  POST — AI pattern generation
│   │   │   ├── regenerate/        POST — AI pattern regeneration
│   │   │   └── tutor/             POST — step-specific AI Q&A (Claude)
│   │   ├── usage/               GET — current user's AI usage + plan limits
│   │   ├── patterns/            GET all (user-scoped), POST create
│   │   ├── patterns/[id]/       GET single, DELETE
│   │   ├── progress/            POST init (idempotent)
│   │   ├── progress/[id]/       PATCH toggle step (atomic)
│   │   ├── progress/pattern/[id]/  GET by patternId
│   │   ├── templates/           GET all (filterable), GET [id]
│   │   └── analytics/           GET usage stats
│   ├── lib/
│   │   ├── auth/
│   │   │   └── session.js       hashPassword, verifyPassword, createUserSession, setSessionCookie
│   │   ├── db/index.js          SQLite singleton, schema init, migrations
│   │   ├── models/
│   │   │   ├── userModel.js     createUser, getUserByEmail, getUserWithSubscriptionById
│   │   │   ├── sessionModel.js  createSession, getSessionByToken, deleteSessionByToken
│   │   │   ├── templateModel.js SQLite queries + 22-template seed data
│   │   │   ├── patternModel.js  CRUD for user-created patterns
│   │   │   ├── progressModel.js CRUD + toggleStepAtomic()
│   │   │   └── usageModel.js    getUsageCount, incrementUsage (monthly upsert)
│   │   ├── services/
│   │   │   ├── aiService.js     Claude / Ollama / fallback logic (prompt caching)
│   │   │   └── patternService.js  Template → structured pattern generation
│   │   └── utils/
│   │       ├── helpers.js
│   │       └── planLimits.js    PLAN_LIMITS, checkRateLimit, recordUsage
│   └── data.db                  SQLite database (auto-created, gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx         Template discovery + beginner path + recent patterns
│   │   │   ├── Account.jsx      Sign up / sign in / sign out + usage bars + upgrade cards
│   │   │   ├── TemplateDetail.jsx  Full template view with CTA
│   │   │   ├── Create.jsx       AI generation + template customization + 429 handling
│   │   │   └── Tracker.jsx      Row-by-row progress tracker + My Projects list
│   │   ├── components/
│   │   │   ├── AuthProvider.jsx useAuth() hook — user, signIn, signUp, signOut
│   │   │   ├── AiTutor.jsx      Floating chat panel — step-specific Claude Q&A
│   │   │   ├── MobileNav.jsx    Portal-rendered slide-in drawer
│   │   │   ├── StitchTooltip.jsx  Stitch term overlay with YouTube links
│   │   │   ├── Skeleton.jsx     Loading skeleton components
│   │   │   ├── Toast.jsx        Toast notification system
│   │   │   ├── TopNav.jsx       Desktop top navigation bar
│   │   │   └── SideNav.jsx      Desktop side navigation
│   │   └── lib/
│   │       ├── patternThemes.js      Category → colour/icon design tokens
│   │       └── crochetAbbreviations.js  Plain-English expander + stitch metadata
│   ├── index.css               Tailwind v4 @theme + design system utilities
│   ├── tailwind.config.js      Frozen Lake color tokens
│   └── vite.config.js
│
├── CLAUDE.md                    Claude Code developer guidance
├── plan.md                      Product roadmap
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
hookSize, yarnWeight, timeEstimate, finishedSize, notes, promptSummary, isAIGenerated, isFallback, createdAt
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

See [plan.md](./plan.md) for the full roadmap. Shipped so far:

- Phase 1 — Core tracker, AI generation, template library, SQLite backend
- Phase 1.5 — Stitch tooltips, beginner path, mobile nav, skeletons, toasts, template detail page
- Phase 2A — Local auth with cookie sessions, user-scoped patterns and progress
- Phase 2B — AI Tutor in tracker, DB performance indexes, form validation, accessibility fixes
- Phase 2C — Per-plan AI rate limiting, monthly usage tracking, prompt caching, Account usage UI
- Phase 2D (UI) — Complete UI/UX redesign: Frozen Lake design system, Fraunces serif, card-lift components, all pages rebuilt

Next priorities:

1. **Learn page** — searchable stitch reference, embedded YouTube tutorials (data already in `crochetAbbreviations.js`)
2. **Photo → Pattern** — upload a photo, get a reverse-engineered pattern (viral growth lever)
3. **Beginner Mode** — "I'm confused" button per step, AI explains the step differently
4. **Community** — shareable pattern links, pattern feed, Crochet-Alongs
5. **PWA** — installable on mobile (manifest + service worker), prerequisite for app store
6. **Stripe billing** — wire up Maker Pro / Creator checkout to upgrade plans automatically

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
