# Loopsy — Product Plan

## What Was Built (Phase 1)

### Completed

**Core stability:**
- SQLite-backed backend with persistent `data.db` (patterns, progress, templates)
- Atomic step toggle via exclusive SQLite transaction — no race condition when tapping steps rapidly
- Idempotent progress init — refresh no longer resets tracker progress
- Consistent API response shapes across all routes

**Templates:**
- 22 curated templates seeded into SQLite on first startup
- Categories: Wearable, Accessory, Amigurumi, Blanket, Home Decor
- Difficulty levels: Beginner, Intermediate, Advanced
- Each template has full step-by-step instructions, materials, notes, hook/yarn/time/size metadata
- Real crochet product photos from Unsplash (`imageUrl` field) — scarves, amigurumi, bags, blankets; gradient artwork fallback

**Discovery (Home page):**
- Searchable template library with category + difficulty filter chips
- Template cards with real photos and card-lift hover effect
- Recent creations panel links back to open tracker sessions

**AI generation:**
- Configurable: uses `claude-sonnet-4-6` (via `@anthropic-ai/sdk`) if `ANTHROPIC_API_KEY` is set
- Falls back to local Ollama (phi3) if no API key
- Falls back to labeled practice pattern if both fail
- Claude path uses structured tool_use — guaranteed JSON schema, full metadata in one call, no crochet abbreviations
- Enhanced system prompt enforces detailed per-row instructions with stitch counts, hook placement, and beginner clarifications

**Tracker:**
- Animated SVG progress ring
- Left panel shows real template photo (or gradient artwork for AI patterns)
- Step instructions expand all crochet abbreviations to plain English
- Materials and maker notes displayed in tracker
- Current step highlighted; completed steps struck through

---

## What Was Built (Phase 1.5 — Immediate Wins + Polish)

### Completed

- Stitch Tooltip Overlay: every stitch name in tracker steps is hoverable, showing a portal-rendered popover with explanation + curated YouTube tutorial link
- "Start Here" Beginner Path: 6 curated templates in learning progression on Home page
- Mobile Navigation: portal-rendered slide-in drawer, wired to all pages
- Loading Skeletons: `SkeletonTemplateCard`, `SkeletonTrackerLayout`, `SkeletonTemplatePreview`
- Toast Notification System: error, success, info toasts via `useToast()`
- Dismissible error banners on Create page
- Image lazy loading with fade-in transitions
- Template Detail page (`/templates/:id`)
- Backend: pattern delete, analytics endpoint, template search/filter API
- Enhanced AI system prompt

---

## What Was Built (Phase 2A — Auth)

### Completed

- Custom cookie-based auth (scrypt password hashing, `HttpOnly` 30-day sessions)
- `POST /api/auth/signup`, `/login`, `/logout`, `GET /api/me`
- All patterns and progress scoped to `userId`
- Free subscription auto-created on signup
- `Account.jsx` — sign up / sign in / sign out + plan summary
- `AuthProvider.jsx` — `useAuth()` hook wrapping the app

---

## What Was Built (Phase 2B — AI Tutor + Code Quality)

### Completed

**AI Tutor:**
- `POST /api/ai/tutor` — auth-protected; Claude called with full pattern context + current step as system prompt
- `AiTutor.jsx` — portal-rendered floating FAB + chat panel; pulse animation on first load; 3 suggested starter questions; session-only conversation history
- Wired into `Tracker.jsx` — passes current step index, pattern title and difficulty

**Code quality / accessibility:**
- SQLite indexes for `users.email`, `sessions.token`, `patterns.templateId`
- Per-field form validation, `aria-label` on checkboxes, `useCallback` on nav close handlers

---

## What Was Built (Phase 2C — Rate Limiting + Prompt Caching)

### Completed

- `ai_usage` SQLite table — per-user monthly usage counters, auto-resets by `YYYY-MM` key
- `usageModel.js` — `getUsageCount`, `incrementUsage` (atomic monthly upsert)
- `planLimits.js` — `PLAN_LIMITS`, `checkRateLimit`, `recordUsage`
- Rate limiting wired into `/api/ai/generate-pattern`, `/api/ai/regenerate`, `/api/ai/tutor`
- 429 `RATE_LIMIT_EXCEEDED` response with used/limit/plan fields
- `GET /api/usage` endpoint returns live usage + plan limits
- Prompt caching (`cache_control: ephemeral`) on all Claude system prompts — ~90% repeated token cost reduction
- `Account.jsx` — animated usage progress bars, upgrade plan cards (Maker Pro / Creator)
- `Create.jsx` — 429 detection shows "View plans →" link to `/account`
- `/tracker` without patternId shows a "My Projects" list of all user patterns (fixes blank page bug)

---

## What Was Built (Phase 2D — UI/UX Redesign)

### Completed

**Design system:**
- **Frozen Lake palette** — navy `#1E40AF` primary, slate `#4E6878` secondary, warm amber `#B45309` tertiary accent, crisp blue-white surfaces `#F6F9FF`
- **Fraunces** variable serif display font (Google Fonts) for all page headings
- **Plus Jakarta Sans** for body and UI text (was already used)
- Tailwind color tokens in `tailwind.config.js` + CSS variables in `index.css` via `@theme`
- New utilities: `shadow-warm`, `shadow-warm-md/lg/xl`, `card-lift`, `ghost-border`
- Custom checkbox styled to primary navy

**All pages rebuilt:**
- `Home.jsx` — Fraunces serif hero, white cards with `border + shadow-warm + card-lift`, terracotta/teal/amber category gradients in patternThemes, rounded-full filter chips
- `Create.jsx` — clean single-column layout, rounded-full CTAs, warm amber prompt tips card
- `Tracker.jsx` — navy progress ring, My Projects list with category gradient icon squares, editorial left panel
- `Account.jsx` — avatar initials circle, usage bars with amber warning at 80%, plan cards with check icons
- `TemplateDetail.jsx` — full-width gradient hero, white metadata grid cards, rounded-full CTAs
- `SideNav.jsx` / `TopNav.jsx` / `MobileNav.jsx` — white sidebar with "Crochet Studio" subtitle, Fraunces logo

---

## Phase 2 — Core Monetisation & Beginner Onboarding (remaining)

### 1. ~~Authentication & User Accounts~~ ✅ Phase 2A
### 2. ~~AI rate limiting + usage tracking~~ ✅ Phase 2C
### 3. ~~Prompt caching~~ ✅ Phase 2C
### 4. ~~UI/UX Redesign~~ ✅ Phase 2D

### 5. Beginner Mode in Tracker
- Opt-in toggle on Beginner-difficulty patterns
- "I'm confused" button on every step → AI explains that specific step differently
- Visual milestone markers
- Encouragement checkpoints at 25%, 50%, 75% completion

### 6. Learn Page — Interactive Stitch Library (`/learn`)
- Searchable stitch reference with embedded YouTube tutorials (data already in `crochetAbbreviations.js`)
- Stitch curriculum: slip knot → chain → slip stitch → sc → hdc → dc → magic ring → increases/decreases → joining

### 7. Onboarding Learning Path
- Signup question: "Have you crocheted before?"
- Never tried → guided 4-project path pre-selected, Beginner Mode on by default

### 8. Stripe Billing
- Wire up Maker Pro / Creator checkout to upgrade plans automatically
- Currently: plan upgrades are manual DB edits

### 9. Discovery Expansion
- Sort options: newest, quickest, beginner-friendly
- More templates (target 50+)
- Featured collections

### 10. Export & Sharing
- Print-friendly pattern PDF export (Maker Pro feature)
- Shareable read-only pattern link
- Copy pattern as plain text

---

## Phase 3 — Differentiation & Marketplace

- Pattern Marketplace (listing, buying, selling, Verified badge)
- **Photo → Pattern** — upload photo → Claude Vision reverse-engineers a pattern (viral growth lever)
- Yarn Stash Manager (label scanning + "what can I make from my stash?")
- Modular Crochet Design Studio (SVG assembly + parametric generation)
- Skill Progression + Technique Unlocks
- "What Went Wrong?" Troubleshooting Guide
- Crochet-Along (CAL) Events

---

## Phase 4 — Scale & Expansion

- Stitch diagram auto-generation from text patterns
- Pattern bundle selling
- Pattern subscription packs
- Yarn affiliate links on all material lists
- Featured placement marketplace ads
- Local Yarn Store business accounts
- Knitting support (3x TAM expansion)
- Global localization: Brazil, Germany, Netherlands, Japan
- B2B yarn brand partnerships

---

## Execution Order

```
✅ Shipped   Phase 1 — Core tracker, AI generation, template library
✅ Shipped   Phase 1.5 — Polish, stitch tooltips, beginner path, mobile nav
✅ Shipped   Phase 2A — Auth + user-scoped patterns and progress
✅ Shipped   Phase 2B — AI Tutor + DB indexes + form validation + a11y
✅ Shipped   Phase 2C — Rate limiting + monthly usage tracking + prompt caching
✅ Shipped   Phase 2D — Complete UI/UX redesign (Frozen Lake design system)

Next         Phase 2E — Learn page + Beginner Mode + onboarding learning path
             Phase 2F — Stripe billing + PDF export + discovery expansion
             Phase 3  — Photo→Pattern + Marketplace + Stash manager
             Phase 4  — Knitting + global + B2B + stitch diagrams
```

---

## Project Assessment (current)

| Area | Score | Notes |
|------|-------|-------|
| Core idea | 9/10 | Real gap — Ravelry is 17 years old with no AI. 60–80M global crocheters, digitally underserved. |
| UI/UX | 8.5/10 | Frozen Lake design system, Fraunces serif, white card layout, consistent tokens. Missing: dark mode, onboarding flow. |
| Backend | 7/10 | Auth, rate limiting, prompt caching all shipped. SQLite works single-user; Postgres migration needed before 5k MAU. |
| AI integration | 7.5/10 | Structured tool_use, enhanced prompts, prompt caching. Pattern accuracy still ~50–70% for complex items. |
| Beginner experience | 8/10 | Stitch tooltips with YouTube links are genuinely unique. Start Here path is smart. Missing: Learn page, Beginner Mode. |
| Monetization | 2/10 | Rate limiting and usage tracking shipped. Stripe billing not yet wired — plan upgrades are manual DB edits. |
