# Loopsy — Implementation PR Plan

> **Companion to** [`01-roadmap.md`](./01-roadmap.md). This turns the epics into an
> **ordered queue of reviewable PRs**.
>
> **Execution gates (every PR honors these):**
> 1. Reviewed by **Principal Reviewer + Security Architect + PM** before merge.
> 2. **Never blind refactors** — always preserve existing functionality.
> 3. The engine `node:test` suite (27) **must stay green**; add tests when touching `lib/engine/`.
> 4. Idempotent migrations; centralized entitlement/policy; no LLM-computed stitch counts.
>
> **Sequencing principle:** low-risk, no-external-dependency PRs ship first; externally-gated
> PRs come after. Each PR is tagged **`UNBLOCKED-NOW`** or **`BLOCKED-ON-<dep>`**.

---

## Legend

- **Risk:** Low / Medium / High (blast radius × reversibility).
- **Reviewers:** PR = Principal Reviewer, SA = Security Architect, PM = Product Manager.
  (All three sign every PR per the execution gates; the listed reviewer is the *primary*.)

---

## Wave 0 — Quality floor (UNBLOCKED-NOW, ship first)

### PR-01 — zod validation at route edges `UNBLOCKED-NOW`
- **Goal:** Validate + coerce every request body/query at the API boundary; reject malformed input with consistent 400s.
- **Scope:** `backend/app/api/**` handlers; new `backend/lib/validation/schemas.js`; reuse in `designSpec.js` normalize path (do not duplicate engine validation).
- **Risk:** Medium — touches many routes. Mitigate by adding schemas additively (parse-then-passthrough) before tightening.
- **Test/verify:** Unit tests per schema (valid/invalid); manual smoke of each route; engine suite unaffected; frontend node:test green.
- **Reviewers:** SA (primary) / PR / PM.
- **Dependency:** none.
- **Rollback:** Schemas are per-route; revert the file + handler wrapper. No data changes.

### PR-02 — Dependabot + `npm audit` gate in CI `UNBLOCKED-NOW`
- **Goal:** Automated dependency PRs + fail CI on high/critical advisories.
- **Scope:** `.github/dependabot.yml`; add `npm audit --audit-level=high` step to `.github/workflows/ci.yml` (backend + frontend).
- **Risk:** Low.
- **Test/verify:** CI run shows audit step; confirm a known-clean tree passes; engine + lint + build stay green.
- **Reviewers:** SA (primary) / PR.
- **Dependency:** none.
- **Rollback:** Remove the CI step / dependabot file.

### PR-03 — OpenAPI spec from the route catalog `UNBLOCKED-NOW`
- **Goal:** Machine-readable API contract (drives client gen + future API gateway).
- **Scope:** `docs/api/openapi.yaml` generated from `docs/api/01-endpoint-catalog.md`; add a CI lint (`spectral`) — **docs/CI only, no source change**.
- **Risk:** Low.
- **Test/verify:** Spec lints clean; spot-check 5 routes against handlers.
- **Reviewers:** PR (primary) / PM.
- **Dependency:** none (best landed after PR-01 so schemas inform the spec).
- **Rollback:** Delete spec + lint step.

### PR-04 — React component test harness (RTL + jsdom) `UNBLOCKED-NOW`
- **Goal:** Establish the harness + a few seed tests so subsequent decomposition is safe.
- **Scope:** `frontend/` test config (vitest + jsdom + @testing-library/react), seed tests for a stable component (e.g. AuthProvider, a chip).
- **Risk:** Low — additive.
- **Test/verify:** `npm test` (frontend) runs RTL + existing node:test; CI green.
- **Reviewers:** PR (primary).
- **Dependency:** none. **Must precede PR-05/06/07** (it's their safety net).
- **Rollback:** Remove harness + seed tests.

---

## Wave 1 — Decomposition & a11y (UNBLOCKED-NOW, behavior-preserving)

> Each decomposition PR is **strictly behavior-preserving**, gated by characterization tests
> written in the same PR (RTL from PR-04). No logic changes mixed in.

### PR-05 — Decompose `Create.jsx` (729 LOC) `UNBLOCKED-NOW`
- **Goal:** Split into container + presentational subcomponents + hooks; no behavior change.
- **Scope:** `frontend/src/pages/Create.jsx` → `Create/` (form, AI-text panel, Vision entry, customization). Extract data hooks.
- **Risk:** Medium — central creation flow. Mitigate with RTL characterization tests first.
- **Test/verify:** RTL covering the create + AI-generate + vision-entry paths; manual smoke of `/create/:templateId`; visual parity.
- **Reviewers:** PR (primary) / PM.
- **Dependency:** PR-04.
- **Rollback:** Revert PR (single squashed commit); no API/DB impact.

### PR-06 — Decompose `Tracker.jsx` (682 LOC) `UNBLOCKED-NOW`
- **Goal:** Split My-Projects vs single-tracker; extract row-counter/progress hooks.
- **Scope:** `frontend/src/pages/Tracker.jsx` → `Tracker/`.
- **Risk:** Medium.
- **Test/verify:** RTL for counter increment/persist + project list; manual smoke of `/tracker` and `/tracker/:patternId`.
- **Reviewers:** PR (primary) / PM.
- **Dependency:** PR-04.
- **Rollback:** Revert PR.

### PR-07 — Decompose `VisionStudio.jsx` (411 LOC) `UNBLOCKED-NOW`
- **Goal:** Separate upload/analyze, confidence chips, spec-edit panels.
- **Scope:** `frontend/src/components/VisionStudio.jsx` → `VisionStudio/`.
- **Risk:** Medium — the metered analyze path must stay exactly intact (1 free lifetime trial).
- **Test/verify:** RTL mocking `analyze-image`; verify chip edits still produce the same Design Spec payload; manual smoke.
- **Reviewers:** PR (primary) / SA (metering) / PM.
- **Dependency:** PR-04.
- **Rollback:** Revert PR.

### PR-08 — a11y heading-order + contrast audit `UNBLOCKED-NOW`
- **Goal:** Full heading hierarchy + WCAG AA contrast pass across primary routes.
- **Scope:** `frontend/src/**` (semantic headings, color tokens in `design-system`), no logic change.
- **Risk:** Low.
- **Test/verify:** axe-core run in RTL; manual screen-reader pass of `/`, `/create`, `/design`, `/tracker`, `/account`.
- **Reviewers:** PR (primary) / PM.
- **Dependency:** PR-04 (axe in harness); best after PR-05/06/07 (stable DOM).
- **Rollback:** Revert PR (style/markup only).

---

## Wave 2 — M5 Stripe Billing (BLOCKED-ON-Stripe-key, but independent of infra)

### PR-09 — Stripe SDK + config validation `BLOCKED-ON-Stripe-key`
- **Goal:** Add `stripe`, validate `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` at init.
- **Scope:** `backend/lib/config.js` (`validateConfig`), package deps. **No behavior** until keys present (fails-loud like `FRONTEND_URL`).
- **Risk:** Low.
- **Test/verify:** Config-validation unit test (missing key logs loudly); app boots without keys in dev.
- **Reviewers:** SA (primary) / PR.
- **Dependency:** Stripe key procurement (code lands first, keys later).
- **Rollback:** Remove config keys; dep is inert.

### PR-10 — Checkout + Customer Portal endpoints `BLOCKED-ON-Stripe-key`
- **Goal:** `POST /api/billing/checkout` + `POST /api/billing/portal`.
- **Scope:** new `backend/app/api/billing/*`; price-ID → plan map in **one** module next to `planLimits.js`.
- **Risk:** Medium — payment surface. requireAuth; CSRF origin-check applies.
- **Test/verify:** Stripe test-mode checkout; unit test the price→plan map; zod (PR-01) on bodies.
- **Reviewers:** SA (primary) / PM / PR.
- **Dependency:** PR-09; Stripe key.
- **Rollback:** Remove routes; no entitlement change (webhook owns state).

### PR-11 — Webhook → `subscriptions` upsert + entitlement enforcement `BLOCKED-ON-Stripe-key`
- **Goal:** Verify signature, idempotently upsert subscription, handle update/delete (downgrade/grace), write `audit_log`.
- **Scope:** `backend/app/api/billing/webhook`; `lib/models/` subscription writes; dedupe via stored `stripe_event_id`; `planLimits.PLAN_LIMITS` consumes resulting plan.
- **Risk:** High — entitlement source of truth. Idempotency + signature verification mandatory.
- **Test/verify:** Replay Stripe test events (created/updated/deleted/duplicate); assert idempotency; assert `planLimits` enforces new plan; audit row written.
- **Reviewers:** SA (primary) / PR / PM.
- **Dependency:** PR-10.
- **Rollback:** Disable webhook route; subscriptions frozen at last state (safe).

### PR-12 — Billing UI + wire the 429 upgrade hook `BLOCKED-ON-Stripe-key`
- **Goal:** `/account` plan card → Checkout; existing 429 upgrade hook → Checkout; manage → Portal.
- **Scope:** `frontend/src/pages/Account` + the shared 429/upgrade component.
- **Risk:** Medium.
- **Test/verify:** RTL for upgrade CTA; e2e test-mode purchase → plan reflects in `/api/me`.
- **Reviewers:** PM (primary) / PR.
- **Dependency:** PR-10/11.
- **Rollback:** Revert UI; backend billing stays functional.

---

## Wave 3 — M6 Data Platform (BLOCKED-ON-Postgres / Redis)

### PR-13 — DB-driver abstraction behind `lib/db` `UNBLOCKED-NOW (prep)`
- **Goal:** Introduce an adapter interface so `lib/models/*` call a driver, not `better-sqlite3` directly — **SQLite stays the default**. Pure refactor, zero behavior change.
- **Scope:** `backend/lib/db/index.js`, thin adapter; `lib/models/*` switch to the adapter API.
- **Risk:** Medium — touches every model. Behavior-preserving; engine untouched (DB-agnostic).
- **Test/verify:** Full engine + model tests green on SQLite via the adapter; no query changes.
- **Reviewers:** PR (primary) / SA.
- **Dependency:** none — **this is the unblock-now prep that de-risks Postgres**.
- **Rollback:** Revert to direct SQLite calls.

### PR-14 — Postgres dialect + migrations `BLOCKED-ON-Postgres-host`
- **Goal:** Postgres schema + idempotent migrations (`docs/database/02-target-postgres.md`), pooling.
- **Scope:** `lib/db` Postgres driver, migration runner, `pg.Pool`/pgBouncer.
- **Risk:** High — data layer. Mitigate: dual-run against SQLite test fixtures.
- **Test/verify:** Model test-suite runs against a Postgres container in CI; idempotency verified by re-running migrations.
- **Reviewers:** PR (primary) / SA.
- **Dependency:** PR-13; Postgres host.
- **Rollback:** Config flag selects SQLite driver.

### PR-15 — Data migration + cutover `BLOCKED-ON-Postgres-host`
- **Goal:** Export SQLite → Postgres with dual-read verification, then cut over.
- **Scope:** one-off migration script; verification harness comparing row counts/checksums.
- **Risk:** High.
- **Test/verify:** Dry-run on a prod snapshot; row-count + spot-check parity; reversible window.
- **Reviewers:** PR (primary) / SA / PM.
- **Dependency:** PR-14.
- **Rollback:** Driver flag back to SQLite (data preserved in backup).

### PR-16 — Redis cache adapter `BLOCKED-ON-Redis-instance`
- **Goal:** Cache template reads, `/api/me`, design previews behind an interface (no-op fallback when Redis absent).
- **Scope:** `lib/cache/*`; opt-in at read sites.
- **Risk:** Low/Medium — cache invalidation discipline.
- **Test/verify:** Cache hit/miss + invalidation tests; correctness identical with cache disabled.
- **Reviewers:** PR (primary).
- **Dependency:** Redis instance.
- **Rollback:** Disable cache flag → falls back to DB reads.

### PR-17 — Distributed rate-limit on Redis `BLOCKED-ON-Redis-instance`
- **Goal:** Move rolling-window counters from `rate_limits` table → Redis (atomic, multi-instance).
- **Scope:** `lib/models/rateLimitModel.js` peek/hit/clear → Redis backend behind same interface.
- **Risk:** Medium — preserve exact login/signup throttle semantics (5/(ip,email), 20/ip/15min, 10 signup/ip/hr).
- **Test/verify:** Port existing throttle tests to Redis backend; assert identical thresholds + clear-on-success.
- **Reviewers:** SA (primary) / PR.
- **Dependency:** PR-16; Redis.
- **Rollback:** Interface flag → DB-backed counters.

### PR-18 — Full-text search `BLOCKED-ON-Postgres-host`
- **Goal:** `GET /api/search` over patterns/templates/designs via Postgres FTS.
- **Scope:** search model + route + minimal UI entry.
- **Risk:** Low/Medium.
- **Test/verify:** Query tests; soft-deleted rows excluded (respects `deletedAt`).
- **Reviewers:** PR (primary) / PM.
- **Dependency:** PR-14.
- **Rollback:** Remove route + index.

---

## Wave 4 — Observability (Sentry NOW; rest BLOCKED-ON-AWS)

### PR-19 — Sentry via `captureError` seam `BLOCKED-ON-Sentry-DSN` (DSN is instant)
- **Goal:** Wire Sentry into `logger.captureError` + frontend error boundary; attach `requestId`.
- **Scope:** `backend/lib/logger.js`, frontend error boundary. Seams already exist.
- **Risk:** Low.
- **Test/verify:** Forced test error appears in Sentry; PII scrubbed; no-op without DSN.
- **Reviewers:** SA (primary) / PR.
- **Dependency:** Sentry DSN.
- **Rollback:** Remove DSN → seam no-ops.

### PR-20 — OTel + Prometheus/Grafana/Loki/Tempo `BLOCKED-ON-AWS`
- **Goal:** OTLP traces, Prom metrics, log/trace dashboards.
- **Scope:** OTel SDK init, metrics middleware, infra dashboards.
- **Risk:** Medium.
- **Test/verify:** Local OTel collector shows spans; metrics scrape; staging dashboards.
- **Reviewers:** PR (primary) / SA.
- **Dependency:** PR-21 (cloud); AWS.
- **Rollback:** Disable exporters.

### PR-21 — AWS/EKS via Terraform/Helm/ArgoCD + staging `BLOCKED-ON-AWS`
- **Goal:** Reproducible cloud infra + GitOps + a real staging env (promote-on-green).
- **Scope:** `infra/` Terraform (VPC/RDS/ElastiCache/EKS), Helm charts, ArgoCD apps.
- **Risk:** High — foundational infra. Land incrementally (network → data → compute → GitOps).
- **Test/verify:** `terraform plan` review; staging brought up + smoke; ArgoCD sync green.
- **Reviewers:** SA (primary) / PR / PM.
- **Dependency:** AWS accounts; Postgres/Redis decisions (PR-14/16) inform RDS/ElastiCache.
- **Rollback:** Terraform destroy of new env; prod unaffected until cutover.

---

## Wave 5 — M7 Teams/RBAC (BLOCKED-ON-Postgres)

### PR-22 — Org tenancy model `BLOCKED-ON-Postgres` (after PR-14)
- **Goal:** `orgs`, `org_members`, `org_id` FKs on `patterns`/`designs`/`progress` (nullable → personal space).
- **Risk:** High — schema + scoping. Migrate existing rows to a personal org.
- **Test/verify:** Migration backfills personal orgs; read scoping tests; soft-delete preserved.
- **Reviewers:** PR (primary) / SA.
- **Dependency:** PR-14.
- **Rollback:** Migration is additive (nullable FK); revert routes.

### PR-23 — Central RBAC policy `can(user, action, resource)` `BLOCKED-ON-Postgres`
- **Goal:** Single policy module; roles owner/admin/member/viewer. **No scattered checks** (CLAUDE.md).
- **Scope:** `lib/auth/policy.js`; route handlers call `can()`.
- **Risk:** High — authorization. Deny-by-default; exhaustive matrix tests.
- **Test/verify:** Policy matrix unit tests; per-route authz tests; audit on denials.
- **Reviewers:** SA (primary) / PR.
- **Dependency:** PR-22.
- **Rollback:** Revert; tenancy stays single-owner.

### PR-24 — Invitations + org UI + seat billing `BLOCKED-ON-Postgres + Stripe`
- **Goal:** Invite tokens (reuse `email_tokens`), org switcher, shared library, seat-based plan tie-in to M5.
- **Risk:** Medium.
- **Test/verify:** Invite → accept → access; seat count → Stripe quantity; RTL for switcher.
- **Reviewers:** PM (primary) / SA / PR.
- **Dependency:** PR-23 + PR-11.
- **Rollback:** Disable org UI; personal spaces unaffected.

---

## Wave 6 — M9 Intelligence & remaining security (BLOCKED-ON data/infra)

### PR-25 — MFA + secrets manager `BLOCKED-ON-AWS (secrets mgr)`
- **Goal:** TOTP MFA on auth; move secrets to AWS Secrets Manager.
- **Risk:** Medium/High (auth surface).
- **Test/verify:** Enroll/verify/recovery-code tests; secret rotation smoke.
- **Reviewers:** SA (primary) / PR.
- **Dependency:** PR-21 (secrets mgr); auth MFA portion is partly unblocked.
- **Rollback:** Feature-flag MFA off; env-var secrets fallback.

### PR-26 — pgvector recommendations `BLOCKED-ON-Postgres`
- **Goal:** Embeddings + "patterns like this" + semantic search over FTS.
- **Risk:** Medium.
- **Test/verify:** Recall spot-checks; latency budget; cache via PR-16.
- **Reviewers:** PR (primary) / PM.
- **Dependency:** PR-14 + PR-18.
- **Rollback:** Remove route/index; FTS search remains.

### PR-27 — AI Copilot (conversational spec-builder) `BLOCKED-ON-Postgres/Search`
- **Goal:** Conversational assistant that **emits Design Specs** — the engine still owns *all* arithmetic (CLAUDE.md #10).
- **Scope:** new AI service reusing the Haiku-parse → Spec → engine → Sonnet-humanize pipeline; never lets the LLM compute counts.
- **Risk:** Medium — guard the math boundary.
- **Test/verify:** Specs run through `validator.js` → "Verified math ✓"; refuse/repair on invalid spec; engine suite green.
- **Reviewers:** PR (primary) / SA / PM.
- **Dependency:** PR-14 (+ PR-18/26 for grounding).
- **Rollback:** Disable Copilot entry; existing front doors unaffected.

---

## Critical path (one line)

> **PR-04 → PR-13 → PR-14 → PR-15 → (PR-22 → PR-23 → PR-24) / (PR-18 → PR-26) / PR-27**,
> with **Stripe (PR-09→12)**, **Sentry (PR-19)**, and the **Quality bar (PR-01,02,03,05–08)**
> running in parallel off the critical path. **Postgres (PR-14) is the keystone.**

---

**Reviewed by: CEO / Principal Reviewer / PM**
