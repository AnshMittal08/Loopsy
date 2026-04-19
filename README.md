# 🧶 Loopsy — Crochet AI Designer

> **AI-powered crochet pattern generation, customization, and step-by-step progress tracking.**

Loopsy is a full-stack web application that helps crochet enthusiasts discover, customize, and track handcrafted patterns. It features a **Next.js API backend** for pattern management and progress tracking, and a **React + Vite frontend** with a modern, responsive UI styled with Tailwind CSS.

---

## 📁 Project Structure

```
Loopsy/
├── backend/          # Next.js API backend (runs on port 3000)
│   ├── app/
│   │   ├── api/
│   │   │   ├── templates/route.js        # GET all pattern templates
│   │   │   ├── patterns/route.js         # POST create a new pattern
│   │   │   └── patterns/[id]/route.js    # GET/PATCH/DELETE a pattern
│   │   │   └── progress/                 # Progress tracking endpoints
│   │   └── layout.js
│   ├── lib/
│   │   ├── data/                         # Static seed data (templates, patterns)
│   │   ├── models/
│   │   │   ├── patternModel.js           # In-memory pattern store
│   │   │   ├── progressModel.js          # In-memory progress store
│   │   │   └── templateModel.js          # Template definitions
│   │   ├── services/
│   │   │   └── patternService.js         # Business logic for pattern customization
│   │   └── utils/                        # Shared utility helpers
│   ├── next.config.js                    # CORS headers configured for all /api/* routes
│   └── package.json
│
├── frontend/         # React + Vite frontend (runs on port 5173)
│   ├── src/
│   │   ├── components/
│   │   │   ├── SideNav.jsx               # Sidebar navigation
│   │   │   └── TopNav.jsx                # Top navigation bar
│   │   ├── pages/
│   │   │   ├── Home.jsx                  # Explore & browse patterns
│   │   │   ├── Create.jsx                # Pattern creation workspace
│   │   │   └── Tracker.jsx               # Step-by-step progress tracker
│   │   ├── App.jsx                       # Root component with React Router routes
│   │   ├── main.jsx                      # Vite entry point
│   │   ├── App.css
│   │   └── index.css                     # Global styles & Tailwind directives
│   ├── vite.config.js                    # Dev proxy: /api → http://localhost:3000
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |

---

### 1. Clone the Repository

```bash
git clone https://github.com/AnshMittal08/Loopsy.git
cd Loopsy
```

---

### 2. Start the Backend (Next.js API)

```bash
cd backend
npm install
npm run dev
```

The backend will start on **http://localhost:3000**.

> The Next.js backend exposes a REST API only — it has no frontend pages. All API routes are under `/api/*`.

---

### 3. Start the Frontend (React + Vite)

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on **http://localhost:5173**.

> The Vite dev server automatically proxies all `/api` requests to `http://localhost:3000`, so no CORS issues in development.

---

## 🔌 API Reference

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | List all available crochet pattern templates |

### Patterns

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/patterns` | Create a new pattern (from a template + customizations) |
| `GET` | `/api/patterns/:id` | Get a specific pattern by ID |
| `PATCH` | `/api/patterns/:id` | Update/customize an existing pattern |
| `DELETE` | `/api/patterns/:id` | Delete a pattern |

### Progress

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/progress/:patternId` | Get progress for a pattern |
| `POST` | `/api/progress/:patternId` | Initialize progress tracking |
| `PATCH` | `/api/progress/:patternId` | Update step completion status |

---

## 🖥️ Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Home** | Browse and explore available pattern templates |
| `/create` | **Create** | Customize a template into a personal pattern |
| `/tracker/:patternId` | **Tracker** | Step-by-step tracker with progress persistence |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Browser (Port 5173)             │
│                                             │
│   React + Vite + Tailwind CSS               │
│   ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│   │  Home    │ │  Create  │ │  Tracker  │  │
│   └──────────┘ └──────────┘ └───────────┘  │
│         │  fetch('/api/...')                │
└─────────┼───────────────────────────────────┘
          │ Vite Dev Proxy
          ▼
┌─────────────────────────────────────────────┐
│        Next.js API Server (Port 3000)        │
│                                             │
│   /api/templates  → templateModel           │
│   /api/patterns   → patternModel            │
│                   → patternService          │
│   /api/progress   → progressModel           │
└─────────────────────────────────────────────┘
```

**Data Layer:** The current implementation uses **in-memory stores** (no database). Data resets on server restart. This is intentional for the MVP and makes the project easy to run locally without any database setup.

---

## 🛠️ Tech Stack

### Backend
- **Next.js 14** (API Routes only — App Router)
- **uuid** for unique pattern/progress IDs
- In-memory data store (no DB dependency for MVP)

### Frontend
- **React 19** with functional components and hooks
- **Vite 8** as the build tool and dev server
- **React Router DOM v7** for client-side routing
- **Tailwind CSS v4** for utility-first styling
- **Lucide React** for icons

---

## 🤖 AI Context for Teammates

> This section is specifically for AI assistants (GitHub Copilot, Cursor, etc.) to understand the codebase.

### Key Design Decisions
1. **Monorepo with two separate apps**: `backend/` and `frontend/` are independently runnable Node.js projects. They are not linked via a workspace manager — run `npm install` in each separately.
2. **Next.js is API-only**: The `backend/` uses Next.js App Router exclusively for its `/api` route handlers. There are no pages, layouts with UI, or RSCs rendering HTML.
3. **In-memory state**: `patternModel.js`, `progressModel.js`, and `templateModel.js` use module-level JavaScript arrays/maps as the data store. No ORM, no SQL, no MongoDB.
4. **Vite proxy**: The frontend's `vite.config.js` proxies `/api/*` → `localhost:3000`. All frontend API calls should use relative paths like `fetch('/api/templates')`, not absolute URLs.
5. **Tailwind CSS v4**: The project uses the newer `@tailwindcss/postcss` plugin (not the classic `tailwindcss` PostCSS plugin setup). Configuration is in `tailwind.config.js` and `postcss.config.js`.
6. **No auth**: There is no authentication or session management in this MVP. All users share the same in-memory state.

### Extending the Project
- **Add a database**: Replace the in-memory model files in `lib/models/` with Prisma/Drizzle ORM clients. The service layer (`lib/services/`) abstracts business logic from data access.
- **Add AI generation**: The `patternService.js` is the right place to integrate an LLM call (e.g., OpenAI API) to generate pattern steps from a prompt.
- **Add authentication**: Wrap API routes in a middleware pattern. Next.js middleware (`middleware.js` at the root) can intercept requests before they hit route handlers.
- **New frontend pages**: Add a new `.jsx` file in `frontend/src/pages/`, create a route in `App.jsx`, and add a nav link in `SideNav.jsx`.

---

## 📝 Notes

- Both servers must be running simultaneously for the app to work.
- The backend runs on port **3000** and the frontend on **5173** — do not change these ports without also updating `vite.config.js`.
- If you see CORS errors, ensure the backend is running. The `next.config.js` already sets permissive CORS headers for all `/api/*` routes.

---

## 👥 Team

Built with ❤️ by [Ansh Mittal](https://github.com/AnshMittal08)
