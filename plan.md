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

## Phase 2 — Next Milestones

### 1. Authentication & User Accounts
- Add authentication (Clerk, NextAuth, or custom JWT)
- Scope patterns and progress to `userId`
- Saved libraries, favorites, recently viewed

### 2. Discovery Expansion
- Individual template detail pages (`/templates/:id`)
- Sort options: newest, quickest, beginner-friendly
- More templates (target 50+) with richer metadata
- Featured collections / curated packs

### 3. AI Workflow Improvements
- Structured input form: project type, recipient, size, yarn weight, colour palette, style
- Regenerate-with-edits: modify an existing AI pattern without starting over
- Pattern versioning (keep a history of regenerations)
- AI generation preview before saving

### 4. Export & Sharing
- Print-friendly pattern PDF export
- Shareable read-only pattern link
- Copy pattern as plain text

### 5. Media
- User-uploaded project cover photos
- Completed project gallery per pattern
- Progress photo capture (camera from mobile)

### 6. Quality & Reliability
- Backend route tests for patterns, progress, and AI endpoints
- Frontend tests for home filtering, create flow, tracker interactions
- Input validation and error boundaries across all flows
- Rate limiting on AI generation endpoint

---

## Suggested Execution Order

1. Auth + user-scoped data (unlocks saved libraries and sharing)
2. Discovery expansion + template detail pages
3. AI structured inputs + regenerate-with-edits
4. Export / sharing
5. User media upload + project gallery
6. Automated tests + hardening
