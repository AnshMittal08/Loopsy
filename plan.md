# Loopsy / StitchFlow AI — Product Plan

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
- Template cards with real photos + 3D CSS perspective tilt on hover
- Featured project card shows template image and description
- Recent creations panel links back to open tracker sessions

**AI generation:**
- Configurable: uses `claude-sonnet-4-6` (via `@anthropic-ai/sdk`) if `ANTHROPIC_API_KEY` is set
- Falls back to local Ollama (phi3) if no API key
- Falls back to labeled practice pattern if both fail
- Claude path uses structured tool_use — guaranteed JSON schema, full metadata in one call, no crochet abbreviations
- Enhanced system prompt enforces detailed per-row instructions with stitch counts, hook placement, and beginner clarifications
- Ollama path uses heuristic metadata enrichment (inferCategory, inferMaterials, etc.)
- Difficulty auto-capitalized at route level (no more casing mismatch)

**Tracker:**
- Animated SVG progress ring (replaces flat bar segments)
- Left panel shows real template photo (or gradient artwork for AI patterns)
- Step instructions expand all crochet abbreviations to plain English (sc → single crochet, ch → chain, etc.)
- Materials and maker notes displayed in tracker
- Current step highlighted; completed steps struck through

**Terminology:**
- `crochetAbbreviations.js` utility with word-boundary-aware regex expansion
- Applied to all step instructions in the tracker

---

## What Was Built (Phase 1.5 — Immediate Wins + Polish)

### Completed

**Stitch Tooltip Overlay in Tracker:**
- Every recognised stitch name in tracker steps is hoverable/tappable
- Portal-rendered popover (escapes `overflow-y-auto` containers) shows:
  - Full stitch name
  - 2-sentence beginner-friendly explanation
  - "Watch tutorial" button linking to curated YouTube video (Bella Coco, TL Yarn Crafts)
  - "Learn more" link (ready for future `/learn` page)
- Only one tooltip open at a time across the page
- Click-outside and Escape key dismissal
- 13 stitches have video links (sc, dc, hdc, ch, sl st, magic ring, inc, dec, yo, tr, BLO, FLO, sc2tog)

**"Start Here" Beginner Path on Home Page:**
- 6 curated templates in learning progression between Hero and Discover sections
- Sequence: Classic Scarf → Coaster Set → Ear Warmer → Dishcloth → Baby Booties → Beanie Hat
- Each card shows sequence badge (1–6), template photo, name, "what you'll learn" chip
- Horizontal scroll with snap on mobile, 3-column grid on desktop
- Only visible when no search/filter is active

**Mobile Navigation:**
- Portal-rendered slide-in drawer (renders to `document.body` — escapes all parent stacking contexts)
- Wired to hamburger buttons on: TopNav (Home), Tracker header, Create header
- Create page has sticky mobile header with back-to-Explore arrow + hamburger
- Escape key and overlay click dismissal
- Auto-closes on route change (without closing on mount)

**Loading Skeletons:**
- `SkeletonTemplateCard` — matches template card layout in Home grid
- `SkeletonTrackerLayout` — two-panel layout matching Tracker page
- `SkeletonTemplatePreview` — matches template preview in Create page
- Replaces all "Loading..." text across Home, Tracker, and Create pages

**Toast Notification System:**
- `ToastProvider` context wrapping the app
- `useToast()` hook returns `showToast(message, type)`
- Types: error (red), success (green), info (neutral)
- Auto-dismiss after 4s, manual dismiss via X, stacks at bottom-center
- Used in Tracker for step toggle errors

**Error Handling:**
- Dismissible error banners on Create page (both template and AI modes)
- User-friendly error messages replace generic "Request failed" text

**Image Handling:**
- All 22 template images replaced with actual crochet product photos from Unsplash
- Lazy loading (`loading="lazy"`) on template card images
- Fade-in transition on image load (opacity 0→1 over 500ms)

**Template Detail Page (`/templates/:id`):**
- Full-width hero image with difficulty/category badges
- Description, metadata grid (hook, yarn, time, size), materials, maker notes
- Read-only default pattern steps with abbreviation expansion
- Tags display
- CTA buttons: "Customize This Pattern" and "AI Remix"
- Linked from Home page template cards ("Details" button)

**Backend Enhancements:**
- `DELETE /api/patterns/:id` — deletes pattern + associated progress records
- `GET /api/analytics` — returns pattern counts, AI usage, template count, avg completion rate
- `GET /api/templates?difficulty=&category=&q=` — server-side search/filter with dynamic SQL
- Difficulty normalization in both AI generation routes

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
- `POST /api/ai/tutor` — auth-protected endpoint; Claude (`claude-sonnet-4-6`) called with full pattern context + current step as system prompt; 503 if no API key
- `AiTutor.jsx` — portal-rendered floating FAB (bottom-right) + chat panel; pulse animation on first load; 3 suggested starter questions; session-only conversation history; Escape/click-outside dismissal
- Wired into `Tracker.jsx` — passes current step index (first uncompleted step), pattern title and difficulty

**Code quality / accessibility:**
- SQLite indexes added for `users.email`, `sessions.token`, `patterns.templateId` — eliminates table scans on login, session validation, and template queries
- `Tracker.jsx` — guarded `pattern.steps || []` crash, `aria-label` on checkboxes, toast on failed progress init, `useCallback` on MobileNav close
- `Account.jsx` — client-side validation (email regex, password ≥ 8 chars, name required), inline per-field errors, `htmlFor`/`id` label associations
- `Home.jsx` — accessible `sr-only` label + `id` on search input
- `Create.jsx` — `useCallback` on MobileNav close

---

## Phase 2 — Core Monetisation & Beginner Onboarding

### 1. ~~Authentication & User Accounts~~ ✅ Shipped (Phase 2A)

### 2. Subscription Tiers
- Free: 3 AI generations/month, 3 AI tutor questions/month, 20% marketplace commission
- Maker Pro ($9/month): 30 AI generations, unlimited tutor, PDF export, 12% commission
- Creator ($18/month or free at $200 GMV): unlimited AI, analytics, 8% commission, featured placement
- AI generation rate limiting and usage tracking per user
- Prompt caching on system prompt (immediate ~90% cost reduction on repeated calls)

### 3. Beginner Mode in Tracker
- Opt-in toggle on Beginner-difficulty patterns
- "I'm confused" button on every step → AI explains that specific step differently
- Visual milestone markers ("here's what your piece should look like at this point")
- Encouragement checkpoints at 25%, 50%, 75% completion

### 4. Learn Page — Interactive Stitch Library (`/learn`)
- Searchable stitch reference with embedded YouTube tutorials (data already in `crochetAbbreviations.js`)
- Stitch curriculum: slip knot → chain → slip stitch → sc → hdc → dc → magic ring → increases/decreases → joining
- Each stitch: explanation, curated video, "used in these patterns" links, common mistakes
- Stitch tooltips in tracker link here

### 5. ~~AI Tutor — Contextual Q&A in Tracker~~ ✅ Shipped (Phase 2B)
- Floating FAB in tracker, portal-rendered
- Claude receives full pattern + current step as context
- Rate limiting (free tier cap) deferred to when subscriptions are implemented

### 6. Onboarding Learning Path
- Signup question: "Have you crocheted before?"
- Never tried → guided 4-project path (pre-selected, Beginner Mode on by default)
- Each project has "what you'll learn" banner
- Milestone badge on completion

### 7. Discovery Expansion
- Sort options: newest, quickest, beginner-friendly
- More templates (target 50+) with richer metadata
- Featured collections and curated packs

### 8. AI Workflow Improvements
- Structured input form: project type, recipient, size, yarn weight, colour palette, style
- Regenerate-with-edits: modify an existing AI pattern without starting over
- Math constants layer in system prompt (raises accuracy floor, no API cost)
- RAG over template library via `sqlite-vec` + Voyage AI embeddings

### 9. Export & Sharing
- Print-friendly pattern PDF export
- Shareable read-only pattern link
- Copy pattern as plain text

### 10. Media
- User-uploaded project cover photos
- Completed project gallery per pattern
- Real-time cost calculator (yarn cost per skein → estimated project budget)

---

## Phase 3 — Differentiation & Marketplace

### 1. Pattern Marketplace
- Pattern listing, buying, and selling
- AI stitch count validator + Verified badge before listing
- Pricing guidance based on comparable patterns
- Designer trust policy prominent at signup (AI patterns = personal use only, never sold)
- 0% commission for first 20 designers (seed the catalog with quality)

### 2. Photo → Pattern (reverse engineering)
- Upload photo of any crocheted item
- Claude Vision analyzes stitch structure, counts rows, identifies techniques
- Returns reverse-engineered pattern as a starting point
- Biggest viral acquisition feature — nobody else has this

### 3. Yarn Stash Manager
- Photograph yarn label → Claude reads brand, weight, yardage, fibre, colour
- "What can I make from my stash?" → AI matches stash to patterns
- Daily-use retention feature

### 4. Modular Crochet Design Studio
- Visual SVG character designer (not 3D — flat illustration style)
- Pick head shape, body, ear type, limb style, size
- Preview assembles in real time from SVG component library
- "Generate Pattern" sends structured design parameters to Claude
- Produces more accurate patterns than freeform prompts because math is constrained

### 5. Skill Progression + Technique Unlocks
- Track techniques encountered and completed per user
- "Technique unlocked" notification on project completion
- Feeds adaptive AI: stops suggesting patterns with techniques not yet learned
- Skill tree visible on user profile

### 6. "What Went Wrong?" Troubleshooting Guide
- Symptom → diagnosis → fix format
- Common beginner problems: edges widening, holes in fabric, visible spiral, magic ring won't close
- Phase 3 extension: photograph the problem → Claude Vision diagnoses it

### 7. Crochet-Along (CAL) Events
- Monthly themed challenge
- One featured designer pattern per event (designer pays $50–100 for feature)
- Community tracks together, drives weekly active usage and social sharing

---

## Phase 4 — Scale & Expansion

- Stitch diagram auto-generation from text patterns (SVG symbol charts)
- Pattern bundle selling (5 patterns as a collection)
- Pattern subscription packs ("4 premium patterns/month for $12")
- Yarn affiliate links on all pattern material lists (3–5% commission, passive)
- Featured placement marketplace ads ($5–20/month for pinned listing position)
- Local Yarn Store (LYS) business accounts ($30/month)
- Knitting support — 3–4x TAM expansion, same codebase
- Global localization: Brazil, Germany, Netherlands, Japan
- B2B yarn brand partnerships and co-branded AI generation

---

## Execution Order

```
Shipped        Phase 1 foundation + Phase 1.5 immediate wins & polish
Shipped        Phase 2A — Auth + user-scoped patterns and progress
Shipped        Phase 2B — AI Tutor + DB indexes + form validation + a11y
Phase 2C       Subscription billing + AI rate limiting per plan
Phase 2D       Learn page + Beginner Mode + onboarding learning path
Phase 2E       Marketplace (listings, buying, selling, Verified badge)
Phase 2F       Discovery expansion + AI workflow improvements + export
Phase 3        Photo→Pattern + Stash manager + Design studio + CAL events
Phase 4        Knitting + global + B2B + stitch diagrams
```

---

## Project Assessment (as of Phase 1.5)

### Current State: 7/10

| Area | Score | Notes |
|------|-------|-------|
| Core idea | 9/10 | Real gap — Ravelry is 17 years old with no AI. 60–80M global crocheters, digitally underserved. |
| UI/UX | 7.5/10 | Material Design 3, mobile nav, skeletons, toasts, 3D elements. Missing: dark mode, onboarding flow. |
| Backend | 6.5/10 | SQLite works single-user but won't scale. No auth = no user data. No rate limiting on AI. Good atomics though. |
| AI integration | 7/10 | Structured tool_use is correct. Enhanced prompts help. Pattern accuracy still ~50–70% for complex items. No prompt caching yet. |
| Beginner experience | 8/10 | Stitch tooltips with YouTube links are genuinely unique. Start Here path is smart. Missing: Learn page, AI tutor. |
| Monetization | 0/10 | None. This is the critical gap between "impressive demo" and "product people pay for." |

### The real risk is distribution, not product

The crochet community is tight-knit and trusts word-of-mouth. The product is strong enough to retain users — the challenge is reaching them. Photo → Pattern is the viral lever; designer seeding (20 designers at 0% commission) + mid-size crochet YouTuber partnerships are the distribution strategy.

---

## Feature Prioritization — What Actually Adds Value

### Immediate (do before Phase 2a)

| Feature | Effort | Why |
|---------|--------|-----|
| **Prompt caching** | 2 lines | Add `cache_control: ephemeral` to system prompt in `aiService.js`. Cuts ~90% of repeated system prompt token cost. Zero-effort, immediate savings. |

### High value — build these (Phase 2)

| Feature | Why it matters |
|---------|---------------|
| **Auth + user accounts** | Blocker for everything. Can't retain users, track cross-device progress, or charge money without it. |
| **AI Tutor in tracker** | One API call per question (~$0.005). "You're on step 8 of your tote bag — here's what this means" is genuinely differentiated. No other crochet app does this. **Justifies the subscription.** |
| **Learn page** | Data already exists in `crochetAbbreviations.js`. Mostly a frontend page. Strong SEO value for "how to single crochet" searches. Makes tooltip "Learn more" links functional. |
| **Photo → Pattern** | Upload a photo → get a pattern. Claude Vision can do this today. **Viral growth feature** — would spread through every crochet TikTok, subreddit, and Facebook group. Could drive 100k signups alone. |

### Medium value — build later

| Feature | Why defer |
|---------|----------|
| **Pattern Marketplace** | Necessary for the business model but hard to bootstrap. Need 20+ quality designers before it's worth visiting. Build after 5k+ MAU. |
| **Yarn Stash Manager** | Good daily-use retention hook ("what can I make from what I have?") but niche. Build after marketplace. |
| **Skill Progression** | Gamification works (Duolingo proved it) but requires a large pattern library to suggest "next challenges." Build after 50+ templates. |

### Lower value — defer or cut

| Feature | Why |
|---------|-----|
| **Modular Design Studio** | Cool concept but enormous engineering effort for a narrow amigurumi use case. SVG component library alone is months. Defer to Phase 4 or cut. |
| **Stitch Diagram Auto-gen** | Technically impressive but the audience that reads stitch diagrams is experienced crocheters who need your app least. Low ROI. |
| **B2B yarn brand partnerships** | Premature before 50k+ MAU. Yarn brands won't engage without meaningful traffic. |

---

## Immediate Next Steps (Priority Order)

```
✅ Done   Prompt caching in aiService.js
✅ Done   Auth + user accounts (Phase 2A)
✅ Done   AI Tutor — floating chat in tracker (Phase 2B)

1. Subscription billing + AI rate limiting     (Phase 2C — unlocks revenue)
2. Learn page — /learn stitch reference        (Phase 2D — SEO + tooltip completion)
3. Photo → Pattern prototype                   (Phase 3 — viral growth lever)
4. Beginner Mode — "I'm confused" per step     (Phase 2D — retention)
```
