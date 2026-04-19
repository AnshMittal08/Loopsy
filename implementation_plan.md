# Crochet AI Designer — Backend MVP Implementation Plan

## Overview

Build a REST API backend for the Crochet AI Designer platform using **Next.js API Routes (App Router)**. The MVP uses in-memory storage and a static JSON file for templates — no database required. The architecture is cleanly swappable for MongoDB/PostgreSQL and AI-generated patterns later. The frontend can be added to the same Next.js project in a future phase.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Unified frontend+backend, built-in API routes |
| API Style | Route Handlers (`route.js`) | Modern App Router pattern, replaces `pages/api` |
| Storage | In-memory arrays + JSON seed file | No infra overhead for MVP |
| ID Generation | `uuid` package | Unique IDs for patterns & progress |
| CORS | Next.js response headers / `next.config.js` | Built-in, no extra middleware |
| Dev Server | `npm run dev` | Next.js dev server on port 3000 |

> [!NOTE]
> Since we're running locally with `next dev`, in-memory state persists across requests within the same dev server session. This is perfectly fine for the MVP.

---

## Folder Structure

```
d:\Crochet\backend\
├── app/
│   └── api/
│       ├── templates/
│       │   ├── route.js              ← GET /api/templates
│       │   └── [id]/
│       │       └── route.js          ← GET /api/templates/:id
│       ├── patterns/
│       │   ├── route.js              ← GET /api/patterns, POST /api/patterns
│       │   └── [id]/
│       │       └── route.js          ← GET /api/patterns/:id
│       └── progress/
│           ├── route.js              ← POST /api/progress
│           └── [id]/
│               └── route.js          ← PATCH /api/progress/:id
│           └── pattern/
│               └── [patternId]/
│                   └── route.js      ← GET /api/progress/pattern/:patternId
├── lib/
│   ├── data/
│   │   └── templates.json            ← Seed data (3 templates)
│   ├── models/
│   │   ├── templateModel.js
│   │   ├── patternModel.js
│   │   └── progressModel.js
│   ├── services/
│   │   └── patternService.js
│   └── utils/
│       └── helpers.js
├── next.config.js
└── package.json
```

---

## Proposed Changes

### `d:\Crochet\backend\`

---

#### [NEW] `package.json`
- `next`, `react`, `react-dom`, `uuid`
- Scripts: `dev`, `build`, `start`

#### [NEW] `next.config.js`
- CORS headers for all `/api/*` routes (for future frontend integration)

---

### API Route Handlers (`app/api/`)

#### [NEW] `app/api/templates/route.js`
- **`GET`** → returns all templates (id, name, description, difficulty, previewImage) — no defaultPattern

#### [NEW] `app/api/templates/[id]/route.js`
- **`GET`** → returns full template including `defaultPattern`

---

#### [NEW] `app/api/patterns/route.js`
- **`GET`** → returns all created patterns (in-memory)
- **`POST`** → creates pattern from `{ templateId, title, customization: { color, size } }` via `patternService`

#### [NEW] `app/api/patterns/[id]/route.js`
- **`GET`** → returns single pattern by id

---

#### [NEW] `app/api/progress/route.js`
- **`POST`** → initializes progress for `{ patternId }`, returns `{ progressId, completedSteps: [], progressPercentage: 0 }`

#### [NEW] `app/api/progress/[id]/route.js`
- **`PATCH`** → marks step complete `{ stepIndex }`, recalculates `progressPercentage`

#### [NEW] `app/api/progress/pattern/[patternId]/route.js`
- **`GET`** → returns progress record(s) for a pattern

---

### Shared Library (`lib/`)

#### [NEW] `lib/data/templates.json`
3 seed templates with full `defaultPattern` steps:

| Template | Difficulty | Steps |
|---|---|---|
| **Scarf** | Beginner | 10 rows: chain, SC across, repeat |
| **Tote Bag** | Intermediate | 12 rows: magic ring, increase rounds, body, handles |
| **Amigurumi Bear** | Intermediate | 14 rows: magic ring, inc/dec rounds, body parts |

#### [NEW] `lib/models/templateModel.js`
- Loads and exports `templates.json`

#### [NEW] `lib/models/patternModel.js`
- Module-level `patterns[]` array (in-memory), `getAll`, `getById`, `create` helpers

#### [NEW] `lib/models/progressModel.js`
- Module-level `progressRecords[]` array, `getById`, `getByPatternId`, `create`, `update` helpers

#### [NEW] `lib/services/patternService.js`
Customization logic:
- **Color** → prefix each step: `"Using [color] yarn: Chain 20"`
- **Size** → regex-scales all stitch numbers in step text:
  - `small` → `× 0.75`
  - `medium` → `× 1.0` (no change)
  - `large` → `× 1.25`

#### [NEW] `lib/utils/helpers.js`
- `generateId()` — wraps `uuid`
- `calcPercentage(completed, total)` — rounds to 1 decimal
- `scaleStitchCount(text, factor)` — regex replaces integers in step strings

---

## API Summary

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/templates` | All templates (no defaultPattern) |
| GET | `/api/templates/:id` | Full template with defaultPattern |
| POST | `/api/patterns` | Create pattern from template + customization |
| GET | `/api/patterns` | All created patterns |
| GET | `/api/patterns/:id` | Single pattern |
| POST | `/api/progress` | Init progress tracker |
| PATCH | `/api/progress/:id` | Mark step complete |
| GET | `/api/progress/pattern/:patternId` | Get progress for a pattern |

---

## Verification Plan

### Server Startup
```bash
cd d:\Crochet\backend
npm install
npm run dev
# → Server running at http://localhost:3000
```

### Endpoint Tests (curl / browser)
1. `GET /api/templates` → 3 templates returned
2. `GET /api/templates/1` → Scarf with full `defaultPattern`
3. `POST /api/patterns` `{ templateId, title, customization }` → returns modified pattern
4. `GET /api/patterns` → list includes new pattern
5. `POST /api/progress` `{ patternId }` → `{ progressId, completedSteps: [], progressPercentage: 0 }`
6. `PATCH /api/progress/:id` `{ stepIndex: 0 }` → updated completedSteps + percentage
7. `GET /api/progress/pattern/:patternId` → current progress

---

## Open Questions

> [!NOTE]
> Defaulted on these — let me know if you'd like changes:

1. **Port**: `3000` (Next.js default)
2. **Progress scope**: One record per `patternId`, no user auth (User entity is optional for MVP)
3. **In-memory reset on restart**: Patterns and progress reset on server restart — intentional for MVP
4. **Frontend**: Not built yet — Next.js is ready to add pages later in the same project
