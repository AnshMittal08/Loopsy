# StitchFlow AI — Crochet Project Studio

StitchFlow AI is a full-featured crochet project studio for discovering patterns, generating custom designs with AI, and tracking row-by-row progress while you work.

```
frontend/   React 19 + Vite + React Router + Tailwind CSS v4
backend/    Next.js 14 API routes + SQLite (better-sqlite3)
```

---

## Features

### Discovery
- Browse 22 curated templates across Wearable, Amigurumi, Accessory, Blanket, and Home Decor categories
- Filter by category and difficulty (Beginner / Intermediate / Advanced)
- Full-text search across name, description, and tags
- Template cards with real photos and 3D CSS perspective tilt on hover

### AI Pattern Generation
- Describe what you want to make in plain English
- Uses **Claude** (`claude-sonnet-4-6`) when `ANTHROPIC_API_KEY` is set — structured tool_use output, full metadata, no abbreviations
- Falls back to local **Ollama** (phi3) if no API key is configured
- Always returns a usable pattern — clearly labeled fallback if AI is unavailable

### Template Customization
- Pick any template, set yarn colour and size (small / medium / large)
- Stitch counts scale automatically; colour prefix applied to every step

### Progress Tracker
- Row-by-row checkbox tracker with animated SVG progress ring
- Step instructions in plain English — all crochet abbreviations expanded (sc → single crochet, ch → chain, etc.)
- Materials list and maker notes visible while you crochet
- Template photo displayed as the left panel hero image
- Progress persists in SQLite — survives page refresh and server restart
- Atomic step toggle prevents race conditions when tapping steps quickly

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

### 2. Configure AI (optional but recommended)

Create `backend/.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

Without this, the app falls back to local Ollama. Start it in a separate terminal:

```bash
ollama run phi3
```

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

On first run the backend creates `backend/data.db` and seeds all 22 templates automatically. No manual migration needed. To reset to a clean state, delete `backend/data.db` and restart the backend.

---

## Project Structure

```
Loopsy/
├── backend/
│   ├── app/api/
│   │   ├── ai/generate-pattern/     POST — AI pattern generation
│   │   ├── patterns/                GET all, POST create
│   │   ├── patterns/[id]/           GET single
│   │   ├── progress/                POST init (idempotent)
│   │   ├── progress/[id]/           PATCH toggle step (atomic)
│   │   ├── progress/pattern/[id]/   GET by patternId
│   │   └── templates/               GET all, GET [id]
│   ├── lib/
│   │   ├── db/index.js              SQLite singleton, schema init, migrations
│   │   ├── models/
│   │   │   ├── templateModel.js     SQLite queries + 22-template seed data
│   │   │   ├── patternModel.js      CRUD for user-created patterns
│   │   │   └── progressModel.js     CRUD + toggleStepAtomic()
│   │   ├── services/
│   │   │   ├── aiService.js         Claude / Ollama / fallback logic
│   │   │   └── patternService.js    Template → structured pattern generation
│   │   └── utils/helpers.js
│   └── data.db                      SQLite database (auto-created, gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx             Template discovery + recent patterns
│   │   │   ├── Create.jsx           AI generation + template customization
│   │   │   └── Tracker.jsx          Row-by-row progress tracker
│   │   ├── components/
│   │   │   ├── TopNav.jsx
│   │   │   └── SideNav.jsx
│   │   └── lib/
│   │       ├── patternThemes.js     Category → colour/icon design tokens
│   │       └── crochetAbbreviations.js  Plain-English abbreviation expander
│   └── vite.config.js
│
├── CLAUDE.md                        Claude Code developer guidance
├── plan.md                          Product roadmap
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | All templates (summary — no `defaultPattern`) |
| `GET` | `/api/templates/:id` | Full template including `defaultPattern` |
| `GET` | `/api/patterns` | All user-created patterns |
| `GET` | `/api/patterns/:id` | Single pattern with full steps |
| `POST` | `/api/patterns` | Create from template `{ templateId, title, customization: { color, size } }` |
| `POST` | `/api/ai/generate-pattern` | AI generation `{ prompt, difficulty }` |
| `POST` | `/api/progress` | Init or return existing progress `{ patternId }` |
| `GET` | `/api/progress/pattern/:patternId` | All progress records for a pattern |
| `PATCH` | `/api/progress/:id` | Toggle step `{ stepIndex }` |

---

## Database Schema

**templates** — seeded on first startup
```sql
id, name, description, difficulty, category, tags, imageUrl,
hookSize, yarnWeight, timeEstimate, finishedSize, materials, notes, defaultPattern, createdAt
```

**patterns** — user-created
```sql
id, title, templateId, color, size, steps, difficulty, category, tags, materials,
hookSize, yarnWeight, timeEstimate, finishedSize, notes, promptSummary, isAIGenerated, isFallback, createdAt
```

**progress**
```sql
id, patternId, totalSteps, steps (JSON array), progressPercentage, createdAt
```

---

## Useful Commands

```bash
# Lint frontend
cd frontend && npm run lint

# Production builds
cd frontend && npm run build
cd backend && npm run build

# Reset database (re-seeds all 22 templates on next backend start)
rm backend/data.db
```

---

## Roadmap

See [plan.md](./plan.md) for the full Phase 2 roadmap. Upcoming priorities:

1. **Auth** — user accounts, saved libraries, favorites
2. **Discovery** — template detail pages, 50+ templates, curated collections
3. **AI improvements** — structured input form, regenerate-with-edits, pattern versioning
4. **Export** — PDF print, shareable read-only link, plain text copy
5. **Media** — user project photos, completed gallery
