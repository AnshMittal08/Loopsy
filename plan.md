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
- Real Unsplash photo URLs per template (`imageUrl` field); gradient artwork fallback

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
- Ollama path uses heuristic metadata enrichment (inferCategory, inferMaterials, etc.)

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

## Immediate Wins — Ship This Week

Two high-impact beginner improvements that require no new infrastructure.

### 1. Stitch Tooltip Overlay in Tracker

**What:** Every recognised stitch name in a tracker step becomes a hoverable/tappable element showing a 2-sentence explanation + minimal SVG hand-motion diagram.

**Why now:** `crochetAbbreviations.js` already has every stitch name in the codebase. The abbreviation list is the complete data source. This is a UI wrapper around existing data — approximately one day of work.

**How:**
- In `Tracker.jsx`, replace the plain `{expandAbbreviations(stepData.instruction)}` render with a new `<StitchStep>` component
- `StitchStep` parses the instruction text, wraps each recognised stitch term (from `crochetAbbreviations.js`) in a `<StitchTooltip>` element
- `StitchTooltip` renders a popover on hover (desktop) / tap (mobile) with:
  - 2-sentence plain-English explanation of the stitch
  - Small inline SVG showing the needle/hook motion
  - "Learn more →" link pointing to the future `/learn` page
- No API calls, no backend changes, no new dependencies

**Files to touch:** `frontend/src/pages/Tracker.jsx`, new `frontend/src/components/StitchTooltip.jsx`, `frontend/src/lib/crochetAbbreviations.js` (add explanation + svg fields to each entry)

**Success signal:** Track tooltip open rate. If >20% of tracker sessions trigger at least one tooltip, the learn page is worth building.

---

### 2. "Start Here" Beginner Path on Home Page

**What:** A dedicated section above the main pattern library surfacing the 6 easiest templates in a curated, sequenced layout with a clear "New to crochet?" header.

**Why now:** A beginner landing on the home page currently sees 22 patterns with no guidance. One section header and a filtered sub-grid changes the first impression completely. No new infrastructure — just a curated view of existing templates.

**Curated sequence:**
```
1. Classic Scarf         — chain + rows, zero complexity, builds tension control
2. Simple Coaster        — first round project, magic ring introduction
3. Ear Warmer Headband   — rows + seaming, finishing technique
4. Dishcloth             — practice repetition, confidence builder
5. Baby Booties          — shaping introduction, working from sole up
6. Beanie Hat            — working in the round, top-down construction
```

**How:**
- In `Home.jsx`, add a `BEGINNER_PATH_IDS` constant with the 6 template IDs in order
- Render a "Start Here" section before the main `#discover` section
- Layout: horizontal scrollable row on mobile, 3-up grid on desktop
- Each card shows: sequence number badge (1–6), template photo, name, one-line "what you'll learn" label
- No filter chips needed — this section is fixed and curated

**Files to touch:** `frontend/src/pages/Home.jsx` only

**Success signal:** Track clicks from the Start Here section vs the main library. If beginners click through at a higher rate than the general library average, the full onboarding path is worth building.

---

## Phase 2 — Core Monetisation & Beginner Onboarding

### 1. Authentication & User Accounts
- Add authentication (Clerk, NextAuth, or custom JWT)
- Scope patterns and progress to `userId`
- Saved libraries, favorites, recently viewed
- Skill profile stored per user (feeds adaptive AI in Phase 3)

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
- Searchable stitch reference with SVG step-by-step illustrations
- Stitch curriculum: slip knot → chain → slip stitch → sc → hdc → dc → magic ring → increases/decreases → joining
- Each stitch: 2-sentence explanation, SVG motion diagram, "used in these patterns" links, common mistakes, curated YouTube link
- Embedded throughout product — stitch tooltips in tracker link here

### 5. AI Tutor — Contextual Q&A in Tracker
- Floating chat button in tracker
- Claude receives pattern + current step + user skill level as context
- Free: 3 questions/month; Maker Pro: unlimited
- Answers are step-specific, not generic ("you're on Step 8 of your Tote Bag — here's what this means in this context")

### 6. Onboarding Learning Path
- Signup question: "Have you crocheted before?"
- Never tried → guided 4-project path (pre-selected, Beginner Mode on by default)
- Each project has "what you'll learn" banner
- Milestone badge on completion
- Path completion is the conversion trigger for Maker Pro upgrade

### 7. Discovery Expansion
- Individual template detail pages (`/templates/:id`)
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
This week     Stitch tooltip overlay + Start Here section (no auth needed)
Phase 2a      Auth + subscriptions + AI rate limiting
Phase 2b      Beginner Mode + Learn page + AI Tutor
Phase 2c      Marketplace (listings, buying, selling, Verified badge)
Phase 2d      Discovery expansion + AI workflow improvements + export
Phase 3       Photo→Pattern + Stash manager + Design studio + CAL events
Phase 4       Knitting + global + B2B + stitch diagrams
```
