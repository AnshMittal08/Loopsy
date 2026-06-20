# Loopsy Design System 2.0 — "Atelier · Ink & Violet"

> **Phase 5 — Design System & Component Library**
> Source of truth: `frontend/src/index.css` (Tailwind v4 `@theme inline` block).
> **There is no `tailwind.config.js`** — it was removed and must never be reintroduced.
> Tokens are defined as raw CSS custom properties that flip per `html[data-theme]`,
> then mapped to Tailwind color tokens via `@theme inline`. Utilities (`shadow-warm`,
> `card-lift`, `glass-panel`, etc.) live in `@layer utilities`.

Each section is split into:
- **CURRENT (source of truth)** — what ships today, transcribed verbatim from `index.css`.
- **2.0 ADDITIONS (target)** — proposed, additive, backward-compatible tokens/specs.

Legend: ✅ exists in code · 🎯 target (new)

---

## 1. Theming model

Dual theme via the `data-theme` attribute on `<html>`:

| Theme | Selector | Mood |
|------|----------|------|
| **Cloud** (light) | `:root` (default) | cool white, violet ink |
| **Ink** (dark) | `html[data-theme="dark"]` | violet charcoal |

`color-scheme` is set per theme. A dark-only utility variant exists:
`@custom-variant dark (&:where(html[data-theme="dark"] *, html[data-theme="dark"]))`.
Theme bootstrap is loaded from an external `public/theme-init.js` so the SPA CSP can
keep `script-src 'self'` (no `unsafe-inline`). Theme is toggled by
`components/ThemeToggle.jsx`, surfaced in `SideNav` and `MobileNav`.

---

## 2. Color tokens — CURRENT (source of truth)

All values are transcribed exactly from `index.css`. Hex pairs are **Cloud / Ink**.

### 2.1 Surfaces & text

| Token (`--color-*`) | Cloud | Ink |
|---|---|---|
| `surface` | `#F7F7FB` | `#0E0D15` |
| `surface-bright` | `#FFFFFF` | `#262236` |
| `surface-dim` | `#ECECF4` | `#090812` |
| `surface-container-lowest` | `#FFFFFF` | `#0A0910` |
| `surface-container-low` | `#F0F0F7` | `#15131F` |
| `surface-container` | `#E9E8F2` | `#1B1828` |
| `surface-container-high` | `#E0DEED` | `#232032` |
| `surface-container-highest` | `#D5D2E6` | `#2C2840` |
| `on-surface` | `#1A1726` | `#ECE8F6` |
| `on-surface-variant` | `#5A5570` | `#A9A2C0` |
| `inverse-surface` | `#25212F` | `#ECE8F6` |
| `inverse-on-surface` | `#F0F0F7` | `#25212F` |
| `outline` | `#837D99` | `#948CAD` |
| `outline-variant` | `#CBC7DC` | `#393350` |

> Note: `surface-variant` is aliased to `surface-container`; `surface-tint` aliases `primary`;
> `background` aliases `surface`.

### 2.2 Primary — vivid violet

| Token | Cloud | Ink |
|---|---|---|
| `primary` | `#6C4CE8` | `#A78BFF` |
| `primary-dim` | `#5736CC` | `#B9A3FF` |
| `on-primary` | `#FFFFFF` | `#261066` |
| `primary-container` | `#E7E1FF` | `#41299E` |
| `on-primary-container` | `#2A1670` | `#E5DDFF` |
| `primary-fixed` | `#E7E1FF` | `#2C1A75` |
| `primary-fixed-dim` | `#CFC3FF` | `#41299E` |
| `on-primary-fixed` | `#2A1670` | `#E5DDFF` |
| `on-primary-fixed-variant` | `#5736CC` | `#CDBDFF` |
| `inverse-primary` | `#B6A4FF` | `#6C4CE8` |

### 2.3 Secondary — mint

| Token | Cloud | Ink |
|---|---|---|
| `secondary` | `#0E8C74` | `#5FD4B2` |
| `secondary-dim` | `#0A6E5B` | `#7FE0C4` |
| `on-secondary` | `#FFFFFF` | `#0A3A2D` |
| `secondary-container` | `#CDF2E6` | `#155244` |
| `on-secondary-container` | `#07382E` | `#C9F4E4` |

### 2.4 Tertiary — rose

| Token | Cloud | Ink |
|---|---|---|
| `tertiary` | `#C8417E` | `#FF8FBE` |
| `tertiary-dim` | `#A82F66` | `#FFA9CC` |
| `on-tertiary` | `#FFFFFF` | `#54102F` |
| `tertiary-container` | `#FFD9E7` | `#7E2A52` |
| `on-tertiary-container` | `#5C1233` | `#FFD9E7` |

### 2.5 Error

| Token | Cloud | Ink |
|---|---|---|
| `error` | `#C53030` | `#EF6E5E` |
| `error-dim` | `#9B2C2C` | `#F58B7E` |
| `on-error` | `#FFFFFF` | `#3D0A04` |
| `error-container` | `#FAD9D2` | `#5C1E14` |
| `on-error-container` | `#6B1D12` | `#FFD9D2` |

### 2.6 Yarn accents (theme-stable category colors)

These **do not flip** between themes — they are brand/category constants.

| Token | Hex | Swatch use |
|---|---|---|
| `yarn-coral` | `#FF6584` | category |
| `yarn-marigold` | `#FFB02E` | category |
| `yarn-sage` | `#4ECBA0` | category / aurora green |
| `yarn-periwinkle` | `#8B7CF6` | category / aurora violet |
| `yarn-rose` | `#F472B6` | category / aurora rose, gradient-text stop |

### 2.7 Color tokens — 2.0 ADDITIONS (target)

🎯 The current ladder is complete for product UI. 2.0 only adds **semantic
state tokens** for the new primitive library and data viz, derived from existing hues
(no new base hues):

| New token 🎯 | Derivation | Purpose |
|---|---|---|
| `--info` | `= secondary` | informational toasts/badges (today reuses `surface-container-highest`) |
| `--success` | `= secondary` | success state (today `secondary-container`) |
| `--warning` | `= yarn-marigold` | non-error warnings |
| `--focus` | `= primary` | dedicated focus-ring token (see §5) so ring color can diverge from brand later |
| `--chart-1..6` | `primary, secondary, tertiary, yarn-marigold, yarn-coral, yarn-periwinkle` | ordered categorical palette for Charts |
| `--scrim` | `rgba(var(--shadow-rgb), .45)` | modal/drawer backdrop (today ad-hoc `bg-black/40`) |

---

## 3. Typography

### 3.1 CURRENT (source of truth)

| Family token | Stack | Role |
|---|---|---|
| `--font-display` | `"Fraunces", serif` | display/headlines (variable: `SOFT`, `WONK` axes) |
| `--font-headline` | `"Plus Jakarta Sans", sans-serif` | section headings |
| `--font-body` | `"Plus Jakarta Sans", sans-serif` | body (also `<body>` default) |
| `--font-label` | `"Plus Jakarta Sans", sans-serif` | labels/UI |

Fraunces variable-axis behaviors are real, shipping utilities:
- `.display-wonk` — `SOFT 0→100, WONK 0→1` on hover over `0.6s`.
- `.display-relax` — hero headline relaxes from `SOFT 100/WONK 1` to `0/0` on load (`displayRelax` keyframe).
- `.gradient-text` — clips `linear-gradient(100deg, primary, #F472B6 60%, primary)` to the glyphs.

### 3.2 Type scale (target — documents existing usage)

The codebase already uses an ad-hoc set of `text-[Nrem]` steps. 2.0 **names** them as
tokens (🎯) so they stop being magic numbers. Observed in source:
`1.45, 1.7, 1.9, 2, 2.2, 2.4, 2.6, 3.2, 4.4, 11rem` plus Tailwind `text-xs…text-4xl`.

| Token 🎯 | rem | px @16 | Mapped from / role |
|---|---|---|---|
| `text-caption` | 0.75 | 12 | `text-xs` (116 uses) |
| `text-body-sm` | 0.875 | 14 | `text-sm` (156 uses — the workhorse) |
| `text-body` | 1.0 | 16 | `text-base` |
| `text-title-sm` | 1.125 | 18 | `text-lg` |
| `text-title` | 1.45 | 23 | nav brand `text-[1.45rem]` |
| `text-headline-sm` | 1.7 | 27 | `text-[1.7rem]` |
| `text-headline` | 1.9 | 30 | `text-[1.9rem]` |
| `text-display-sm` | 2.2 | 35 | `text-[2.2rem]` |
| `text-display` | 2.6 | 42 | `text-[2.6rem]` |
| `text-display-lg` | 3.2 | 51 | `text-[3.2rem]` |
| `text-hero` | 4.4 | 70 | hero `text-[4.4rem]` |
| `text-mega` | 11.0 | 176 | decorative marquee `text-[11rem]` |

Recommended pairing: **Fraunces** for `title`→`mega`, **Plus Jakarta Sans** for `caption`→`title-sm`.

---

## 4. Spacing, radius, elevation, motion

### 4.1 Spacing — 2.0 ADDITIONS (target)

Today spacing is Tailwind's default 4px scale used directly. 2.0 documents an **8pt
base grid** (🎯) as the canonical rhythm; 4px (`0.5`) remains the half-step for dense controls.

| Token 🎯 | rem | px | Typical use |
|---|---|---|---|
| `space-0.5` | 0.125 | 2 | hairline gaps |
| `space-1` | 0.25 | 4 | icon/label gap (half-step) |
| `space-2` | 0.5 | 8 | **base unit** |
| `space-3` | 0.75 | 12 | control inner padding |
| `space-4` | 1.0 | 16 | card padding (mobile) |
| `space-6` | 1.5 | 24 | card padding (desktop), section gap |
| `space-8` | 2.0 | 32 | block spacing |
| `space-12` | 3.0 | 48 | major section spacing |
| `space-16` | 4.0 | 64 | page gutters (desktop) |

### 4.2 Radius — CURRENT (source of truth)

| Token | Value | Use |
|---|---|---|
| `--radius` | `1rem` (16px) | default; chips, inputs, nav pills (`rounded-xl`) |
| `--radius-md` | `1.5rem` (24px) | cards |
| `--radius-lg` | `2rem` (32px) | panels, hero cards |
| `--radius-xl` | `3rem` (48px) | feature/marketing surfaces |
| `--radius-full` | `9999px` | avatars, pills, badges |

### 4.3 Elevation — CURRENT (source of truth)

Theme-aware shadows driven by `--shadow-rgb` (Cloud `35,28,70` / Ink `0,0,0`) and
`--shadow-strength` (Cloud `1` / Ink `2.2`):

| Utility | Layered box-shadow (Cloud opacities) |
|---|---|
| `.shadow-warm` | `0 2px 8px @7%` + `0 1px 2px @4%` |
| `.shadow-warm-md` | `0 4px 16px @9%` + `0 2px 4px @5%` |
| `.shadow-warm-lg` | `0 8px 28px @11%` + `0 3px 8px @5%` |
| `.shadow-warm-xl` | `0 16px 48px @13%` + `0 6px 16px @7%` |
| `.ambient-shadow` | `0 20px 40px @7%` |
| `.card-lift:hover` | translateY(-4px) + `0 14px 36px @16%` |
| `.glow-lift:hover` | lift + primary glow ring (plan cards) |

Other shipping surface utilities: `.glass-panel` (82% surface + 16px blur),
`.ghost-border` (1px `primary @15%`), `.custom-scrollbar` (5px thin thumb).

### 4.4 Motion — CURRENT (source of truth)

Driven by the `motion` library + `lib/motionTokens.js`:

| Group | Tokens |
|---|---|
| `SPRING` | `gentle {120,20}` · `snappy {300,24}` · `bouncy {400,17}` |
| `EASE` | `out [0.22,1,0.36,1]` · `inOut [0.65,0,0.35,1]` |
| `DURATION` | `fast 0.15` · `base 0.25` · `slow 0.4` · `slower 0.65` |
| Variants | `fadeRise`, `staggerChildren(s,d)`, `popIn` |

Keyframe utilities in CSS: `slideIn, fadeIn, toastIn, shimmer, floaty, displayRelax,
blobDrift (+ `.blob-drift{,-slow,-slower}`), marqueeScroll, pulseRing`.
Decorative utilities: `.shimmer`, `.shine-sweep`, `.pulse-ring`, `.marquee-row`,
`.display-wonk`, `.gradient-text`.

**Global kill-switch:** `@media (prefers-reduced-motion: reduce)` forces all
`animation`/`transition` durations to `0.01ms` and `scroll-behavior: auto`. Every new
component must remain functional under this.

---

## 5. Accessibility tokens & contrast

### 5.1 Focus — CURRENT

Global `:focus-visible` ring: `outline: 2px solid var(--primary); outline-offset: 2px;
border-radius: 4px`. 🎯 2.0 introduces `--focus: var(--primary)` so the ring color can be
tuned independently of brand later, plus an optional `--focus-offset-bg` for ring contrast
on busy aurora backgrounds.

### 5.2 WCAG contrast pairs (target audit)

Approved foreground/background pairings (ratios approximate, computed against the
shipping hexes). Pairs marked **AA** clear 4.5:1 for body / 3:1 for large; **AAA** clear 7:1.

| Pair | Cloud | Ink | Grade |
|---|---|---|---|
| `on-surface` / `surface` | `#1A1726` on `#F7F7FB` | `#ECE8F6` on `#0E0D15` | AAA |
| `on-surface-variant` / `surface` | `#5A5570` on `#F7F7FB` | `#A9A2C0` on `#0E0D15` | AA (body) |
| `on-primary` / `primary` | `#FFF` on `#6C4CE8` | `#261066` on `#A78BFF` | AA (≥4.5 / large AAA) |
| `on-secondary-container` / `secondary-container` | `#07382E` on `#CDF2E6` | `#C9F4E4` on `#155244` | AAA |
| `on-error-container` / `error-container` | `#6B1D12` on `#FAD9D2` | `#FFD9D2` on `#5C1E14` | AAA |
| `primary` text / `surface` | `#6C4CE8` on `#F7F7FB` | `#A78BFF` on `#0E0D15` | AA-large only ⚠ |

⚠ **Guardrail:** raw `primary` as *text* on `surface` only clears large-text AA in Cloud.
For body-size links/labels use `on-surface` or `primary-dim`; reserve bright `primary`
for ≥18px/bold or as a fill behind `on-primary`.

### 5.3 Touch & semantics — target contract

All interactive primitives must meet a **44×44px** minimum touch target (WCAG 2.5.5),
expose an accessible name, and respect the reduced-motion kill-switch. Detailed per-component
contracts in §7.

---

## 6. Responsive breakpoints

### 6.1 CURRENT

The app uses Tailwind's default breakpoints; the load-bearing one is **`md` (768px)**:
below `md` the `SideNav` is hidden and `MobileTabBar` (fixed bottom, `glass-panel`,
`pb-[env(safe-area-inset-bottom)]`) takes over. Full-bleed editors (`/design`, `/d/:id`,
`/verify-email`, `/reset-password`) hide the tab bar. Heights use `dvh`/safe-area insets.

### 6.2 Named breakpoints (target)

| Token 🎯 | min-width | Layout intent |
|---|---|---|
| `mobile` | 0 | single column, bottom tab bar, full-bleed sheets |
| `sm` | 640px | 2-col card grids |
| `tablet` (`md`) | 768px | **SideNav appears**, tab bar hides, 2–3 col |
| `desktop` (`lg`) | 1024px | persistent sidebar + content, 3-col grids |
| `wide` (`xl`) | 1280px | max content width, optional right rail |

---

## 7. Primitive & Component Library

For each: **variants · sizes · states · a11y contract**, and whether it ✅ exists or is 🎯 new.
States are the canonical six: `default / hover / active / focus-visible / disabled / loading`.
All use the tokens above; all inherit the global focus ring and reduced-motion kill-switch.

### 7.1 Button — 🎯 formalize (patterns exist inline across pages)

Today buttons are hand-rolled Tailwind on each page (e.g. SideNav's
`bg-primary text-on-primary hover:bg-primary-dim`). 2.0 extracts a `<Button>` primitive.

| Aspect | Spec |
|---|---|
| Variants | `primary` (fill `primary`→hover `primary-dim`), `secondary` (fill `secondary`), `tonal` (`primary-container`/`on-primary-container`), `outline` (`ghost-border`), `ghost` (transparent→`surface-container-low`), `danger` (`error`), `link` |
| Sizes | `sm` 32h / `md` 40h / `lg` 48h; **touch target padded to ≥44px** on mobile |
| Radius | `rounded-xl` (default) or `rounded-full` (pills/CTAs) |
| States | hover: bg shift + `.shine-sweep` optional; active: `scale .98` (`SPRING.snappy`); focus-visible: 2px primary ring; disabled: `opacity-50 cursor-not-allowed`; **loading**: inline spinner + `aria-busy`, label retained |
| a11y | native `<button>`; icon-only requires `aria-label`; `disabled` not focusable; 44px min |

### 7.2 Input / Textarea — 🎯 formalize (used in Account, Create, Reset/Verify)

| Aspect | Spec |
|---|---|
| Variants | text, email, password (toggle reveal), number, search, textarea (auto-grow) |
| Sizes | `md` 40h / `lg` 48h; textarea min 3 rows |
| States | default `outline-variant` border; hover `outline`; focus-visible primary ring + `primary` border; disabled muted; error `error` border + `on-error-container` helper text; loading skeleton via `.shimmer` |
| a11y | `<label>` always (visible or `sr-only`); `aria-invalid` + `aria-describedby` for errors; 44px target |

### 7.3 Select / Dropdown — 🎯 new

| Aspect | Spec |
|---|---|
| Variants | native `<select>` (forms) · custom listbox (rich options, e.g. yarn weight w/ swatch) · menu (actions) |
| Sizes | `md` / `lg` matching Input |
| States | closed/open; option hover `surface-container-low`; selected `primary-container`; focus roving; disabled option dimmed; loading shimmer rows |
| a11y | `role="listbox"`/`option` + `aria-expanded`/`aria-activedescendant`; full keyboard (↑↓ Home End type-ahead Esc); menus use `role="menu"` |

### 7.4 Card — ✅ pattern exists (Home, Templates, plan cards)

| Aspect | Spec |
|---|---|
| Variants | `surface` (default `surface-container-lowest` + `shadow-warm`), `elevated` (`shadow-warm-lg`), `interactive` (`.card-lift`), `glow` (`.glow-lift`, plan cards), `glass` (`.glass-panel`), `outline` (`ghost-border`) |
| Sizes | padding `space-4` (mobile) → `space-6` (desktop); radius `--radius-md`/`--radius-lg` |
| States | hover lift (`translateY(-4px)`); focus-visible ring if the whole card is a link; loading = `Skeleton`; disabled dimmed |
| a11y | wrap a single primary link; whole-card click must have one real focusable anchor (no nested interactive traps) |

### 7.5 Table — 🎯 new (no table primitive today)

| Aspect | Spec |
|---|---|
| Variants | default, `striped` (`surface-container-low` alt rows), `compact`, `sticky-header` |
| Sizes | row `md` 48h / `compact` 40h |
| States | row hover `surface-container-low`; selected `primary-container`; sortable header focus ring + `aria-sort`; empty state; loading shimmer rows |
| a11y | semantic `<table>`/`<th scope>`; `aria-sort`; on mobile, collapse to stacked cards (label:value); keyboard-navigable sort headers |

### 7.6 Modal / Drawer — 🎯 formalize (a11y dialog patterns + focus traps exist per CLAUDE.md)

| Aspect | Spec |
|---|---|
| Variants | center modal · bottom sheet (mobile-default) · side drawer (filters/detail) |
| Sizes | `sm` 28rem / `md` 36rem / `lg` 48rem; sheet = full-width, `dvh`-aware, safe-area padded |
| States | enter `fadeRise`/`slideIn`; backdrop `--scrim`; focus trapped; Esc + backdrop-click close; loading skeleton body |
| a11y | `role="dialog" aria-modal="true"` + labelled by title; **focus trap + restore** to trigger; scroll-lock; respects reduced motion |

### 7.7 Tabs — ✅ pattern exists (Design Build/Draw, Create text/photo)

| Aspect | Spec |
|---|---|
| Variants | underline · pill (animated `layoutId` pill, as SideNav/TabBar) · segmented |
| Sizes | `md` 40h / `lg` 48h |
| States | active = `primary` text + `layoutId` sliding pill (`SPRING {350,30}`); hover `surface-container-low`; focus-visible ring; disabled tab dimmed |
| a11y | `role="tablist"`/`tab`/`tabpanel`; `aria-selected`; arrow-key roving; pill animation auto-disabled under reduced motion |

### 7.8 Breadcrumbs — 🎯 new

| Aspect | Spec |
|---|---|
| Variants | default (`/` or chevron separators), truncating (collapse middle to `…`) |
| Sizes | `text-body-sm`, `space-2` gaps |
| States | link hover underline; current `aria-current="page"` non-link `on-surface` |
| a11y | `<nav aria-label="Breadcrumb">` + ordered list; separators `aria-hidden` |

### 7.9 Nav — ✅ exists (SideNav / TopNav / MobileNav / MobileTabBar)

| Aspect | Spec |
|---|---|
| Variants | desktop sidebar (`220px`, sticky, brand + 5 items + theme + user + CTA) · top bar · mobile drawer · mobile bottom tab bar |
| Items | Explore `/` · Create `/create` · Design `/design` · In Progress/Projects `/tracker` · Account `/account` |
| States | active = `primary` text + animated pill (`layoutId="sidenav-pill"` / `"tabbar-pill"`); hover `surface-container-low`; focus ring |
| a11y | `<nav aria-label="Primary">`; `aria-current="page"`; tab bar ≥44px targets; full-bleed routes hide chrome |

### 7.10 Charts — 🎯 new (only domain 3D `three/*` + `CanvasStage` exist; no data viz)

| Aspect | Spec |
|---|---|
| Variants | line, bar, area, donut, sparkline (for Dashboard/Analytics targets) |
| Palette | `--chart-1..6` (§2.7); single-series uses `primary` |
| States | empty, loading (shimmer), hover tooltip, focus point keyboard nav |
| a11y | `role="img"` + text summary; data table fallback; never color-only encoding (pattern/label too) |

### 7.11 Search — ✅ partial (filtering exists on Home/Templates) → 🎯 unify

| Aspect | Spec |
|---|---|
| Variants | inline input (Search icon prefix), header search, results dropdown (combobox) |
| Sizes | `md` / `lg` |
| States | empty, typing (debounced), loading spinner, results, no-results, recent/suggestions |
| a11y | `role="combobox"` + `aria-expanded`/`aria-controls`/`aria-activedescendant`; ↑↓/Enter/Esc; clear button labelled |

### 7.12 Toast / Notifications — ✅ exists (`components/Toast.jsx`)

| Aspect | Spec |
|---|---|
| Current | `useToast()`/`ToastProvider`; types `error`/`success`/`info` (lucide `AlertCircle`/`CheckCircle2`/`Info`); bottom-center, `z-60`, `animate-[toastIn]`, max 5 stacked, 4s auto-dismiss, manual `X` |
| Token map | error→`error-container`, success→`secondary-container`, info→`surface-container-highest` |
| 🎯 additions | `warning` type (`yarn-marigold`); action button slot; `role="status"`/`aria-live="polite"` (assertive for errors); pause-on-hover |
| a11y | live region; dismiss button labelled; never sole channel for critical state |

### 7.13 Command Palette (⌘K) — 🎯 new

| Aspect | Spec |
|---|---|
| Trigger | `⌘K`/`Ctrl-K` global; opens center modal over `--scrim` |
| Content | fuzzy search across navigation, templates, designs, actions ("New project", "Toggle theme") |
| States | empty (recents), typing (debounced groups), loading, results, no-results |
| a11y | `role="dialog"` + inner `combobox`/`listbox`; full keyboard; focus trap + restore; Esc closes; respects reduced motion |

---

## 8. Component inventory — code vs target

| Component | Status | File |
|---|---|---|
| SideNav / MobileTabBar / MobileNav / TopNav | ✅ | `components/{SideNav,MobileTabBar,MobileNav,TopNav}.jsx` |
| Toast | ✅ | `components/Toast.jsx` |
| Skeleton (shimmer loading) | ✅ | `components/Skeleton.jsx` |
| VerifiedBadge | ✅ | `components/VerifiedBadge.jsx` |
| ThemeToggle | ✅ | `components/ThemeToggle.jsx` |
| ColorPicker | ✅ | `components/ColorPicker.jsx` |
| StitchTooltip | ✅ | `components/StitchTooltip.jsx` |
| OnboardingCard / AiTutor / CrochetMode / VisionStudio / CanvasStage | ✅ (domain) | `components/*` |
| motion primitives (Reveal, Marquee, Magnetic, PageTransition, CursorDot, Thread, ScrollThread, TiltCard, YarnBallProgress) | ✅ | `components/motion/*` |
| three/* (YarnBallHero, Design3DPreview) | ✅ lazy | `components/three/*` |
| Button, Input/Textarea | 🎯 extract from inline | — |
| Select/Dropdown, Table, Breadcrumbs, Charts, Command Palette | 🎯 new | — |
| Modal/Drawer, Tabs, Search | 🎯 formalize (patterns exist) | — |

---

*Reviewed by: Principal Reviewer / PM / Security Architect*
