# Loopsy — Plan v2: The Rethink

*Supersedes the roadmap in `plan.md` (kept for history). Written June 2026, after Phases 1 → 2E shipped.*

> **Status (updated):** M1–M4 shipped. M1 (Atelier design language), M2 (the verified-math Compiler), M3 (Vision Studio — photo → pattern), and M4 (Design Canvas — Build/Sculpt/3D + Draw colourwork/medallion, unlimited colours, live verified feedback, share pages) are merged to `main`. A hardening pass added an engine test suite + CI, structured logging, DB backups, and onboarding. **M5 (Stripe/PDF/PWA)** and **M6 (growth)** are not started — plan upgrades are still manual DB edits, and Vision needs a live API key to validate end-to-end. See the root `README.md` for current details.

---

## 1. The honest diagnosis

The product foundation is real: auth, tracker, AI generation, tutor, rate limiting, deployment — all shipped. But the old plan has three structural problems:

1. **The magic is buried.** The two features that can actually make this product spread — *photo → pattern* and the *interactive design canvas* — sit in "Phase 3" behind Stripe, PDF export, and discovery expansion. Utility features retain users; **magic features acquire them**. We have no users to retain yet. The order is backwards.

2. **Accuracy is treated as a footnote when it is existential.** Our own assessment (vision.md) says complex patterns are 20–65% accurate because Claude does stitch arithmetic from memory and drifts after ~20 rows. Every flagship feature we want to build *amplifies* this risk: a viral photo→pattern feature that produces broken patterns is viral in the wrong direction. The crochet community talks.

3. **The plan optimizes a 3-year fantasy instead of the next 90 days.** Marketplace commissions, LYS business accounts, localization, knitting expansion — none of it matters before ~1,000 happy weekly users. Cut from the active plan; parked in an icebox.

And one problem the old plan doesn't mention at all: **the UI is clean but forgettable.** Frozen Lake (navy + blue-white cards) reads as a SaaS dashboard. Crochet is warm, tactile, colorful, and proud — the product should *feel* like the craft. This gets a full design reinvention (Section 4).

---

## 2. The unifying insight: one Pattern Compiler, three front doors

Today, Claude does everything — creative interpretation AND stitch math. That's why counts drift.

**The rethink: separate creative intent from arithmetic.**

```
                 ┌─────────────────────────────────────────────┐
  TEXT PROMPT ──►│                                             │
                 │   CLAUDE: intent → Design Spec (JSON)       │
  PHOTOS ───────►│   "a bee amigurumi, 6cm, worked in rounds,  │
                 │    sphere head + ellipsoid body + 2 wings"  │
  DESIGN CANVAS ─►│  (canvas builds the spec directly via UI)  │
                 └──────────────────┬──────────────────────────┘
                                    │  Design Spec
                                    ▼
                 ┌─────────────────────────────────────────────┐
                 │   PATTERN COMPILER (deterministic code)     │
                 │   sphere(circ, gauge) → exact rounds with   │
                 │   correct increase/decrease distribution.   │
                 │   Flat panels, tubes, cones, hemispheres,   │
                 │   hat-crown sizing tables, gauge math.      │
                 │   Stitch counts are COMPUTED, never guessed.│
                 └──────────────────┬──────────────────────────┘
                                    │  Verified rows + counts
                                    ▼
                 ┌─────────────────────────────────────────────┐
                 │   CLAUDE: humanize — write the friendly     │
                 │   instructions, notes, tips AROUND the      │
                 │   engine's numbers. Never invents counts.   │
                 └─────────────────────────────────────────────┘
```

Why this is the moat:

- **Accuracy jumps from ~50% to near-100%** for every shape the compiler supports. The standard amigurumi math (6 sc magic ring, +6 per round to target circumference, even rounds, −6 to close) is *textbook geometry* — code computes it perfectly; an LLM approximates it.
- **All three flagship inputs share one core.** Text prompt, photo analysis, and the design canvas all produce the same Design Spec JSON. Build the compiler once, every feature gets accurate.
- **It cannot be copied by a thin GPT wrapper.** Competitors prompting harder will still drift. A geometry engine + gauge tables + a validator is real, compounding IP.
- **A validator falls out for free**: re-parse any pattern (AI or template), recompute counts row by row, flag drift. This becomes the "Verified math ✓" badge — eventually the marketplace trust signal.

Everything in the roadmap below is sequenced around getting this core built and then putting three increasingly magical doors in front of it.

---

## 3. Product pillars (what Loopsy *is* now)

| Pillar | One-liner | Status |
|--------|-----------|--------|
| **1. Vision Studio** | Describe it *or photograph it* — get a verified step-by-step pattern | New — flagship |
| **2. Design Canvas** | Visually assemble an amigurumi from parts; the math compiles itself | New — flagship |
| **3. The Compiler** | Deterministic crochet geometry: computed counts, never hallucinated | New — the moat |
| **4. Learn-as-you-make** | Tutor, tooltips, beginner mode, milestones — the retention engine | Shipped, extend |

The positioning line updates:

> **"Ravelry has the archive. Loopsy has the intelligence — and the intelligence does the math."**

---

## 4. The visual reinvention — "Atelier" design language

Frozen Lake gets retired. The new direction is warm, tactile, editorial, and *animated* — a craft studio, not a dashboard.

### 4.1 Theme & palette

Dual theme, dark-first (crocheters famously work at night; also dark mode is where modern visual identity lives):

- **"Midnight Wool" (dark)** — deep warm charcoal `#16130F`–`#1E1A14` surfaces, soft cream text, subtle film-grain/noise texture overlay so surfaces feel like fabric, not glass.
- **"Undyed" (light)** — warm oatmeal/cream `#FAF6EF`, espresso text.
- **Yarn accents** — a skein palette used semantically per category, saturated and proud: coral `#FF6B5B`, marigold `#F5A623`, sage `#7FA37A`, periwinkle `#7B8CDE`, rose `#E8728C`. Gradient-mesh blobs in these colors replace the current blue glows.
- Implementation: extend the existing Tailwind v4 `@theme` block in `frontend/src/index.css` with `light-dark()` tokens or a `.dark` class strategy; tokens stay the single source of truth per AGENTS.md.

### 4.2 Typography with personality

- **Keep Fraunces** — it's genuinely good — but *use its variable axes*: animate `SOFT` and `WONK` on the hero headline on hover/load. A headline that subtly "relaxes" as the page loads is a signature move that costs zero bytes (font is already loaded).
- Body stays Plus Jakarta Sans. Add an oversized editorial scale for heroes (clamp-based fluid type up to ~7rem).

### 4.3 The signature motif: the living thread

One continuous SVG yarn thread that draws itself (`stroke-dashoffset` animation). It becomes the brand element across the whole app:

- **Hero**: a thread draws across the landing page, looping through the headline, ending in a yarn ball.
- **Section dividers**: a short thread flourish instead of `<hr>`.
- **Loading states**: a thread tying itself into a loop (replaces spinners).
- **Progress**: the tracker ring becomes a **yarn ball that visibly winds up** as rows complete — thread wraps around the ball, percentage in the center. This is the single most on-brand animation in the app.
- **Page transitions**: a thread pulls across the viewport between routes.

No other crochet product has a motion identity. This is cheap (pure SVG) and unmistakable.

### 4.4 Motion system

Install **`motion`** (Framer Motion's successor, React 19 compatible). Define motion tokens once (`durations: 150/250/400ms`, spring presets `gentle/snappy/bouncy`) and use everywhere:

| Surface | Animations |
|---------|-----------|
| **Global** | Route transitions (fade + 12px rise), nav active-pill slides between items via `layoutId`, magnetic hover on primary CTAs, custom focus rings |
| **Home** | Staggered card entrance on scroll (`whileInView`), filter chips spring when toggled, search input expands on focus, stat numbers count up, thread hero draw-on |
| **Template detail** | **Shared-element transition**: card image morphs into the detail hero (`layoutId` on the image), metadata grid staggers in, sticky CTA appears after scroll threshold |
| **Create (AI)** | The theater moment: **stream the generation** — steps typewriter in one-by-one as Claude streams, yarn-ball loader while thinking, materials checklist pops in with springs, yarn-confetti burst on completion |
| **Tracker** | Winding yarn-ball progress (4.3), checking a row fires a spring tick + strike-through that *draws* across the text, milestone celebrations at 25/50/75/100% (confetti + encouragement card), **Crochet Mode**: full-screen focus view — huge type, dimmed chrome, tap/space to advance, screen wake-lock |
| **Account** | Usage rings animate to value on mount, plan cards lift + glow on hover |
| **Skeletons** | Shimmer sweep with a faint thread motif instead of flat gray blocks |

Rules: every animation respects `prefers-reduced-motion`; motion-heavy components lazy-load; target LCP < 2.5s on mid-range mobile.

### 4.5 Cleanup (do first, it's free)

- **Delete dead code**: `HeroScene.jsx`, `PatternOrb.jsx`, `PaletteSwitcher.jsx` are imported nowhere.
- **Uninstall `three`, `@react-three/fiber`, `@react-three/drei`** — unused, heavy, and the thread/SVG language is more distinctive than 3D anyway. (If a 3D moment is ever wanted, one lazy-loaded yarn ball can return later.)
- **Commit to `lucide-react`** (already installed, unused) and drop the Material Symbols icon *font* — an icon font is a render-blocking webfont; lucide is tree-shakeable SVG with consistent stroke styling that fits the thread motif.

---

## 5. Roadmap — six milestones

Sequenced for: look amazing → be accurate → be magical → get paid → grow.

### M1 — "Glow-Up" · UI reinvention (~2–3 weeks)

The user-facing reset. Everything in Section 4.

1. Token migration: new palette + dark/light themes in `index.css` + `tailwind.config.js` (keep both in sync per AGENTS.md).
2. Dead-code & dependency cleanup (4.5). Icon migration to lucide.
3. Install `motion`; build the motion-token module + `PageTransition`, `Stagger`, `ThreadDraw`, `YarnBallProgress`, `Confetti` primitives.
4. Rebuild pages in order of traffic: Home → Tracker → Create → TemplateDetail → Account.
5. Crochet Mode in tracker (focus view + wake lock).
6. QA pass: reduced-motion, mobile perf, `npm run build` + lint clean.

**Done when:** the app is dark/light themed, every page animates, the yarn-ball tracker is live, and a stranger's first reaction is "whoa" instead of "neat."

### M2 — "The Compiler" · accuracy engine (~2–3 weeks)

New module `backend/lib/engine/`:

1. **Gauge tables** — stitches/rows per 10cm by yarn weight + hook size.
2. **Shape generators** — `flatPanel`, `tube`, `sphere`, `cone`, `hemisphere`, `hatCrown` (sizing tables), `grannySquare`. Each returns exact rows: stitch type, count, increase/decrease placement (standard distribution math).
3. **Design Spec schema** — the JSON contract every front door produces: parts[] (shape, dimensions, color, stitch), assembly order, embellishments.
4. **Compiler** — Spec → ordered rows with computed counts → handed to Claude with a *rewritten contract*: "humanize these rows; you may not alter any number."
5. **Validator** — parse any pattern's steps, recompute running counts, flag drift. Run it against all 22 templates (fix what it finds) and against every AI generation. Surface as a "Verified math ✓" badge in the UI.
6. Rewire `aiService.js`: intent-parsing call (can be Haiku — cheap) → compiler → humanizer call. Freeform fallback (with "experimental" label) for shapes outside the vocabulary.

**Done when:** "a 6cm amigurumi sphere" produces the textbook 6-12-18-24-30… sequence every single time, and the validator badge shows on verified patterns.

### M3 — "Vision Studio" · prompt + photos → pattern (~2 weeks)

The viral lever, built on M2:

1. Backend `POST /api/ai/analyze-image` — accepts up to 3 images (base64, no storage needed initially) + optional text; Claude vision returns a Design Spec **plus a confidence-scored readout** ("I can see: a bee amigurumi, ~6cm, worked in rounds, bobble-stitch stripes — confidence: high").
2. **Confirmation step in the UI** — show the readout as editable chips (size, parts, colors) before generating. The user correcting "6cm → 10cm" before compilation is what makes the output *actually right*, and the analysis reveal is the shareable wow moment.
3. Create page upgrade: drag-drop / camera upload zone with animated previews; analysis streams in; then the M1 streaming-generation theater plays.
4. Rate limits: vision analysis counts as a generation; Free gets **1 vision trial ever** (the hook), Pro gets it properly. Strongest upgrade trigger in the product.
5. Policy banner (designer trust, from vision.md): AI output is personal-use only.

**Done when:** photo of a crocheted bee → editable analysis → verified pattern, end-to-end, in under 60 seconds.

### M4 — "Design Canvas" · interactive designer (~3–4 weeks)

Scope discipline: **amigurumi only in v1** — most visual, most viral, and geometrically the most compiler-friendly (spheres, ellipsoids, cones, tubes).

1. SVG part library (~20 parts): head shapes ×3, body ×3, ears ×4, limbs ×4, eyes/muzzle/tail ×6. Flat, crochet-native illustration style.
2. Canvas page `/design`: pick parts, drag to position, parametric sliders (overall size, head/body ratio, limb length), per-part yarn color from the skein palette. Live assembled preview with springy interactions (motion's drag + layout animations make this feel great for free).
3. Canvas state **is** a Design Spec → compile button → exact per-part patterns + assembly instructions. Claude writes only the intro/notes/personality.
4. **Share cards**: every design renders an auto-generated OG image (the SVG preview on a branded card). Public read-only link `/d/:id`. "Made with Loopsy" footer. This is the TikTok distribution unit.

**Done when:** a 10-year-old can design a creature in 2 minutes and the pattern's math is verified-correct.

### M5 — "Get Paid" · monetization + export (~2 weeks)

Now there's something worth paying for:

1. **Stripe** checkout + customer portal + webhooks → `subscriptions` table (plan changes stop being manual DB edits).
2. Tier reshape: **Free** — 3 gen/mo, 1 vision trial, unlimited tracker. **Maker Pro $9** — 30 gen/mo, full Vision Studio, Canvas exports, PDF export. **Creator $18** — unlimited, analytics, storefront-ready. (Marketplace commission tiers stay parked until the marketplace exists.)
3. PDF export (print-friendly pattern, Pro), copy-as-text (free).
4. PWA: manifest + service worker + offline tracker cache — crocheters work away from connectivity; this is real utility, not checkbox.

### M6 — "The Flywheel" · growth + community seed (~ongoing)

1. Public pattern share pages with OG images (extends M4's share cards to all patterns).
2. Seed 10 mid-size crochet creators (TikTok/YouTube 50k–500k) with free Creator accounts; the Canvas demo video is the pitch.
3. Crochet-Along v1: one monthly featured pattern + a shared progress page.
4. Learn page `/learn` (data already exists in `crochetAbbreviations.js`) — SEO surface + beginner funnel.
5. Postgres/Turso migration **when** ~5k MAU or concurrent-write errors appear — not before.

### Icebox (explicitly deferred, not deleted)

Marketplace transactions · yarn stash manager · skill-graph adaptive AI · stitch diagram generation · knitting expansion · localization · LYS accounts · RAG over pattern vector DB (the compiler delivers a bigger accuracy lift first; RAG returns when freeform generation needs raising).

---

## 6. Architecture notes

- **Keep the two-app split** (Vite SPA + Next.js API). It works, it's deployed, users can't see it. No rewrites for aesthetics.
- **Images**: pass-through to Claude vision, no storage in v1. If/when designs need thumbnails: Railway volume first, R2 when it matters.
- **Model routing**: Haiku for intent-parsing and tutor where quality allows; Sonnet for vision analysis + humanizing. Prompt caching already shipped (Phase 2C) — keep it on every system prompt.
- **Streaming**: switch generation endpoints to streaming responses so the M1/M3 theater UX is real, not simulated.
- **New tables**: `designs` (canvas specs, shareable), later `share_links`. Use the existing incremental-`ALTER TABLE` migration pattern in `backend/lib/db/index.js`.

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Shapes outside compiler vocabulary still drift | Label "experimental", confidence scores, validator badge only when earned. Honesty is the brand. |
| Vision API cost | 1-trial free gate, Pro-only, prompt caching, Haiku for the cheap passes |
| Canvas scope creep | Amigurumi only in v1. Wearables wait for gauge-fit math (genuinely hard). |
| Animation jank on mobile | Motion budget, lazy-loading, reduced-motion, test on a real low-end Android |
| Designer-community AI backlash | Personal-use-only policy stays loud on every AI surface |

## 8. What we measure

- **Activation**: % of new signups who generate or start a project on day 1.
- **Magic moment**: % who complete ≥10 tracker rows in week 1 (the habit signal).
- **Share rate**: share-card link creations per canvas design (the growth signal).
- **Verified rate**: % of generations passing the validator (the quality signal — watch it climb as the compiler vocabulary grows).
- **D7 / D30 retention**, free→paid conversion after vision-trial use.
