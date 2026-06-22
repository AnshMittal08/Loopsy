# Loopsy Screen Specifications

> **Phase 6 — Screen Specs**
> Companion to `design-system-2.0.md`. Tokens, components, and breakpoints referenced
> here are defined there (source of truth: `frontend/src/index.css`).

**Status legend:** ✅ ships today · 🎯 target (not built yet).

**Shared chrome (all primary routes).** Desktop ≥`md` (768px): `SideNav` (220px sticky:
brand "Loopsy / Crochet Studio", Explore · Create · Design Canvas · In Progress · Account,
theme toggle, user chip, "New project" CTA). Below `md`: `MobileTabBar` (fixed bottom
glass bar, 5 tabs, safe-area padded) + `MobileNav` drawer. Active item = `primary` text +
animated `layoutId` pill. Full-bleed routes (`/design`, `/d/:id`, `/verify-email`,
`/reset-password`) suppress the tab bar. Every `<main>` has `id="main-content" tabIndex=-1`
for the skip link. Toasts render bottom-center via `ToastProvider`.

---

## 1. Landing — Home `/` ✅

**Purpose.** Discovery + entry point; doubles as the signed-in dashboard. Surfaces hero CTA,
beginner path, filterable pattern library, and recent creations.

**Layout (grounded in `pages/Home.jsx`).** `max-w-[1440px]` centered main. Sections top→bottom:
(1) Hero card (`rounded-2xl`, `surface-container-lowest`, `shadow-warm-lg`) with animated
split-headline + featured template + lazy `YarnBallHero` 3D; (2) animated stat counter;
(3) "Start Here" beginner path (shown only when unfiltered) — `BEGINNER_PATH` cards; (4)
"Pattern library" — search input + difficulty/category `FilterChip`s + responsive template grid
(`SkeletonTemplateCard` while loading); (5) recent creations with `VerifiedBadge`.

```
┌───────────────────────────────────────────────────────────┐
│ [≡] (mobile)                                    Loopsy     │
│ ┌─ HERO ───────────────────────────────┐  ┌───────────┐   │
│ │  Make anything,                       │  │  3D yarn  │   │
│ │  stitch by stitch.        [Create →]  │  │  ball     │   │
│ │  featured: {template name}            │  └───────────┘   │
│ └───────────────────────────────────────┘                 │
│  42,318 stitches verified ✓   (animated counter)          │
│  Start Here:  [① chain] [② sc] [③ granny] [④ …]           │
│  Pattern library   🔍[Search patterns, tags…]             │
│   ( All | Easy | Medium )  ( All | Amigurumi | Wearable )  │
│   ▦ ▦ ▦ ▦   ← template grid (1→2→3→4 cols)                 │
└───────────────────────────────────────────────────────────┘
```

**Interactions.** Search filters live (`useMemo` over name/tags); difficulty + category chips
AND-combine; first match becomes `featuredTemplate`; cards lift (`.card-lift`) and link to
`/templates/:id` or `/create`; hero CTA → `/create`; reduced-motion disables counter/3D drift.

**Responsive.** Mobile: single column, `pt-24/pb-28` for nav clearance, tab bar. Tablet: 2-col grid,
SideNav appears. Desktop: 3–4 col grid, full hero split.

---

## 2. Authentication — Account `/account` + `/verify-email` + `/reset-password` ✅

**Purpose.** Sign up / sign in / sign out, current plan & AI usage summary, email
verification and password-reset landings.

**Layout (`pages/Account.jsx`).** Single-column card. Signed-out: segmented `signin`/`signup`
toggle → form (name [signup only], email, password) with inline `fieldErrors`, submit (loading
state), generic error copy (no account enumeration). Signed-in: user card (avatar initial,
name, email), plan summary, AI `usage` meter, feature list, sign-out. `/verify-email` and
`/reset-password` are minimal full-bleed token-consuming landings (tab bar hidden).

```
SIGNED OUT                          SIGNED IN
┌───────────────────────┐          ┌───────────────────────┐
│  Welcome back          │          │  (A) Anish             │
│  [ Sign in | Sign up ] │          │  maker@example.com     │
│  Email  [___________]  │          │  Plan: Free            │
│  Pass   [___________]  │          │  AI usage ▓▓▓░░ 3/5     │
│  ( ! field error )     │          │  [ Sign out ]          │
│  [ Continue → ]        │          │  features…             │
└───────────────────────┘          └───────────────────────┘
```

**Interactions.** Toggle swaps mode + resets errors; submit calls `signIn`/`signUp` from
`useAuth()`; throttled server-side (rate_limits); success → toast + redirect; verify/reset
consume single-use hashed tokens then show success/expired states.

**Responsive.** Always single narrow column (`max-w` form), centered; full nav chrome on
`/account`, none on the two token landings.

**a11y.** `<label>` per field; `aria-invalid`/`aria-describedby`; password reveal labelled;
submit shows `aria-busy` while loading; identical 401 copy regardless of account existence.

---

## 3. Dashboard `/dashboard` 🎯 (target)

**Purpose.** Today **Home doubles as the dashboard**. Target: a signed-in command center
distinct from public discovery — projects in progress, recent activity, quick actions, AI quota.

**Layout (target).** Greeting header + quick-action row (New project, New design, Resume last);
metric cards (active projects, completed, stitches verified, AI credits) using `--chart-*`
sparklines; "Continue stitching" rail (in-progress patterns with progress rings); recent designs grid.

```
┌──────────────────────────────────────────────┐
│ Good evening, Anish        [+ New] [Resume]   │
│ ┌Active 3┐ ┌Done 12┐ ┌Stitches 42k┐ ┌AI 3/5┐ │
│ │ ╱╲sprk │ │ ╱sprk │ │  ╱╲ spark   │ │ ▓▓░ │ │
│ Continue stitching ──────────────────────►    │
│  ◔ Bunny 40%   ◑ Hat 60%   ◕ Tote 85%         │
│ Recent designs  ▦ ▦ ▦ ▦                       │
└──────────────────────────────────────────────┘
```

**Interactions.** Cards deep-link to `/tracker/:id`, `/design`, `/account`; progress rings reuse
`YarnBallProgress`; quota card links to plan upgrade.

**Responsive.** Mobile: stacked metric cards (2-up), horizontal-scroll "continue" rail. Tablet/desktop:
4-up metrics, multi-row grids beside SideNav.

---

## 4. Analytics `/analytics` 🎯 (target)

**Purpose.** Maker insights (personal): stitching streaks, time-to-finish, stitch volume over time,
template popularity. Powered by the existing `analytics` table.

**Layout (target).** Date-range control + segmented period tabs; KPI row; primary time-series
chart (stitches/day, line/area, `--chart-1`); secondary bar (projects by category) + donut
(difficulty mix); data table fallback with CSV export.

```
┌──────────────────────────────────────────────┐
│ Analytics      [ 7d | 30d | 90d | All ]       │
│ ┌Streak 9d┐ ┌Avg finish 4d┐ ┌Stitches/wk┐    │
│ ┌── Stitches over time ───────────────────┐   │
│ │       ╱╲      ╱╲╱╲                       │   │
│ │   ╱╲╱   ╲╱╲╱      ╲                      │   │
│ └──────────────────────────────────────────┘  │
│ ┌ By category (bar) ┐  ┌ Difficulty (donut) ┐ │
└──────────────────────────────────────────────┘
```

**Interactions.** Period tabs refetch; hover tooltips; keyboard-navigable data points; table
fallback toggled for screen readers; export.

**Responsive.** Mobile: charts stack full-width, simplified axes, swipe between period tabs.
Desktop: 2-col chart grid.

**a11y.** Charts `role="img"` + text summary; never color-only (label/pattern); reduced-motion
disables draw-in animation.

---

## 5. Projects — Tracker `/tracker` (list) + `/tracker/:patternId` (detail) ✅

**Purpose.** "My Projects" list and the per-pattern progress tracker (the working surface).

**Layout (`pages/Tracker.jsx`).** No id → list: cards of all user patterns with progress %
(`progressMap`) and `VerifiedBadge`; requires auth (sign-in gate otherwise). With id → 2-pane:
left (`lg:w-5/12`) materials/image panel; right (`lg:w-7/12`) tabbed guide (`panelTab`:
steps/materials/notes) with timeline steps, completion checkboxes (`completedCount`), and a
"Crochet Mode" focus toggle (`CrochetMode`). Mobile uses a slide-over panel (`mobileOpen`).

```
LIST (/tracker)                 DETAIL (/tracker/:id)
┌─────────────────┐   ┌──────────────┬────────────────────┐
│ My Projects     │   │  image /      │ [Steps] Materials  │
│ ▦ Bunny  ▓▓░ 40%│   │  materials    │  ○ Ch 24 ……… done  │
│ ▦ Hat    ▓▓▓ 60%│   │  panel        │  ◉ Rnd 1: 6 sc      │
│ ▦ Tote   ▓░░ 20%│   │  ✓ verified   │  ○ Rnd 2: inc → 12  │
└─────────────────┘   │  [Crochet ▶]  │  12 / 30 steps      │
                      └──────────────┴────────────────────┘
```

**Interactions.** List cards → detail; checkbox toggles persist progress per step (current row gets
`.pulse-ring`); tabs switch panels; Crochet Mode enlarges the current step / dims chrome;
mobile menu button opens the materials slide-over.

**Responsive.** Mobile: single column, panel as slide-over, bottom tab bar. Tablet/desktop:
5/12 + 7/12 split, full-height scroll. (Note: this **is** the target "Projects" screen.)

---

## 6. Settings `/settings` 🎯 (target)

**Purpose.** Today **settings live inside Account**. Target: a dedicated grouped settings screen.

**Layout (target).** Left section nav (or tabs) → Profile, Account & Security, Appearance,
Notifications, Billing, Data. Each a card with labeled rows + inline save.

```
┌───────────────┬──────────────────────────────┐
│ ▸ Profile     │  Appearance                   │
│ ▸ Security    │  Theme   ( Cloud | Ink | Auto)│
│ ▸ Appearance  │  Reduce motion        [ on ]  │
│ ▸ Notifications  Default hook size  [ 4.0mm ▾]│
│ ▸ Billing     │  ────────────────             │
│ ▸ Data        │  [ Save changes ]             │
└───────────────┴──────────────────────────────┘
```

**Interactions.** Theme control reuses `ThemeToggle` (writes `data-theme`); destructive actions
(delete account, soft-delete data) confirm via Modal + write to `audit_log`; inline per-row save
with toast confirmation.

**Responsive.** Mobile: section nav collapses to a top `Select`/accordion, full-width cards.
Desktop: persistent left rail + content.

**a11y.** Each control labelled; toggles `role="switch"` + `aria-checked`; destructive dialogs
`aria-modal` with focus trap.

---

## 7. Profile `/profile` 🎯 (target)

**Purpose.** Public-facing maker identity (today only an avatar initial + name in nav/account).
Target: shareable profile of a maker's designs.

**Layout (target).** Header (avatar, display name, bio, join date, stats: designs / projects /
stitches); tabs (Designs · Patterns · Liked); responsive grid of design cards (each links to
`/d/:id`).

```
┌──────────────────────────────────────────────┐
│  (A)  Anish Mittal                            │
│       "Amigurumi enthusiast"   joined 2026    │
│       18 designs · 12 finished · 42k stitches │
│  [ Designs | Patterns | Liked ]               │
│   ▦ ▦ ▦ ▦   ← design cards → /d/:id           │
└──────────────────────────────────────────────┘
```

**Interactions.** Own profile shows Edit (→ Settings/Profile); design cards open public share;
tabs use animated pill pattern.

**Responsive.** Mobile: centered header, 2-col grid. Desktop: left-aligned header, 3–4 col grid.

---

## 8. Notifications `/notifications` 🎯 (target)

**Purpose.** No notifications screen exists today (only transient `Toast`s). Target: a durable
inbox for verification reminders, finished-pattern AI completions, plan/quota alerts, shares.

**Layout (target).** Header with "Mark all read" + filter (All / Unread / System); grouped list
(Today / Earlier); each row = icon (type-colored), title, snippet, timestamp, unread dot, optional
action button.

```
┌──────────────────────────────────────────────┐
│ Notifications        [All|Unread]  Mark read  │
│ Today                                         │
│  ● ✦ Your "Bunny" pattern is ready   [View]   │
│  ● ⚠ 1 AI credit left this month     [Plans]  │
│ Earlier                                       │
│  ○ ✉ Email verified                   2d ago  │
└──────────────────────────────────────────────┘
```

**Interactions.** Click marks read + deep-links; "Mark all read" bulk; filter tabs; empty state.
Type colors map to toast semantics (success→`secondary`, warning→`yarn-marigold`, error→`error`,
info→`surface-container-highest`).

**Responsive.** Mobile: full-width rows, swipe-to-dismiss, accessible from a top-bar bell or tab.
Desktop: list within content column; could surface as a dropdown panel from the nav.

**a11y.** Unread count `aria-live` on the bell; rows are buttons/links with full labels; filter tabs
`role="tablist"`.

---

## 9. Admin `/admin` 🎯 (target)

**Purpose.** No admin screen exists. Target: internal moderation/ops — users, templates, patterns,
AI-usage and audit-log review. Gated behind a role check (reuse `requireAuthenticatedUser()` +
new role; centralize entitlement, per CLAUDE.md guidance).

**Layout (target).** Top KPI strip (users, patterns, AI spend, errors); left section nav (Users,
Templates, Patterns, Audit log, Flags); main = data `Table` (sortable, paginated, sticky header,
row actions: view / soft-delete / restore). Audit log is read-only append-only.

```
┌──────────────────────────────────────────────────────┐
│ Admin   Users 1.2k · Patterns 8.4k · AI $312 · Err 4 │
│ ┌Nav──────┐ ┌ Users table ──────────────────────────┐│
│ │ Users   │ │ Email        Plan  Created   Actions   ││
│ │ Templates│ │ a@…  ↕      Free  2026-01   [⋯]       ││
│ │ Patterns │ │ b@…         Pro   2026-03   [⋯]       ││
│ │ Audit    │ └───────────────────────── ◀ 1 2 3 ▶ ──┘│
│ └─────────┘                                           │
└──────────────────────────────────────────────────────┘
```

**Interactions.** Sortable headers (`aria-sort`); search/filter; row actions confirm via Modal and
append to `audit_log`; soft-delete sets `deletedAt` (restorable); destructive actions double-confirm.

**Responsive.** Primarily desktop; tablet collapses nav to a `Select`; mobile collapses table rows
to stacked label:value cards (admin is a desktop-first surface).

**a11y / security.** Role-gated route + server authz on every mutation; tables semantic with
`scope`; every privileged action audited; same-site/CSRF protections apply.

---

## 10. Current vs target summary

| Screen | Route | Status |
|---|---|---|
| Landing (Home) | `/` | ✅ (also acts as dashboard) |
| Authentication | `/account`, `/verify-email`, `/reset-password` | ✅ |
| Template detail | `/templates/:id` | ✅ |
| Create (text + Vision Studio) | `/create/:templateId?` | ✅ |
| Design Canvas (Build/Draw) | `/design` | ✅ |
| Design share (public) | `/d/:id` | ✅ |
| Projects (Tracker list + detail) | `/tracker/:patternId?` | ✅ |
| Dashboard | `/dashboard` | 🎯 (Home stands in) |
| Analytics | `/analytics` | 🎯 |
| Settings | `/settings` | 🎯 (Account holds settings) |
| Profile | `/profile` | 🎯 |
| Notifications | `/notifications` | 🎯 (only transient toasts today) |
| Admin | `/admin` | 🎯 |

---

*Reviewed by: Principal Reviewer / PM / Security Architect*
