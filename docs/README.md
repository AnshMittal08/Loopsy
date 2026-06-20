# Loopsy — Engineering Knowledge Base

> Produced by a multi-agent engineering organization (CEO, PM, UX Research, Staff
> Designer, Frontend/Backend/Database/Security/Cloud/DevOps Architects, Senior
> Engineers, Performance, QA, AI Product Architect, and a Principal Reviewer).
> Every "current state" claim is grounded in the real codebase; every forward
> proposal is labelled **(target)** / **[TARGET]**. **No source code was modified
> to produce these documents** — per the execution gates, design precedes
> implementation.

## How to read this

- Start with the **executive summary**: [`LOOPSY_ENTERPRISE_BLUEPRINT.md`](./LOOPSY_ENTERPRISE_BLUEPRINT.md) — the single-file blueprint (all 20 deliverables) and the **Section 0 hardening punch-list** (most of which is now shipped).
- Then drill into the domain docs below. Each ends with a **Reviewer sign-off** block (Principal Reviewer / Security Architect / PM) and open questions.

## Domain index

### `product/` — what & why
- [`00-product-overview.md`](./product/00-product-overview.md) — problem, moat, value-prop canvas, positioning, competitors
- [`personas.md`](./product/personas.md) — Beginner, Power User/Designer (current); Admin, Org Owner (target)
- [`ai-opportunities.md`](./product/ai-opportunities.md) — Copilot/Recs/Search/Summaries/Automation/Analytics, RICE + Impact×Effort

### `architecture/` — how it's built
- [`01-current-architecture.md`](./architecture/01-current-architecture.md) — stack, layers, Design-Spec contract, full C4 model (Mermaid)
- [`02-scalability.md`](./architecture/02-scalability.md) — 10k→10M, AWS topology, SQLite→Postgres path, event-driven design

### `ux/` — experience
- [`journey-maps.md`](./ux/journey-maps.md) — onboarding/core/retention/upgrade/collaboration (Mermaid)
- [`information-architecture.md`](./ux/information-architecture.md) — sitemap, per-breakpoint nav, permission/role matrix
- [`ux-audit.md`](./ux/ux-audit.md) — UX/UI/a11y findings (severity, impact, evidence, recommendation)

### `ui/` — design system & screens
- [`design-system-2.0.md`](./ui/design-system-2.0.md) — Atelier tokens (current, exact) + 2.0 targets + component library spec
- [`screen-specs.md`](./ui/screen-specs.md) — every screen: purpose, layout, wireframe, interactions, responsive

### `database/`
- [`01-current-schema.md`](./database/01-current-schema.md) — SQLite ERD, indexes, soft-delete/audit, normalization
- [`02-target-postgres.md`](./database/02-target-postgres.md) — Postgres target (JSONB/GIN, multi-tenancy, partitioning, migration plan)

### `api/`
- [`01-endpoint-catalog.md`](./api/01-endpoint-catalog.md) — full REST catalog + auth/authz sequence diagrams
- [`02-api-modernization.md`](./api/02-api-modernization.md) — v1/OpenAPI, GraphQL BFF, WebSockets, RBAC, caching, gateway

### `security/`
- [`01-owasp-review.md`](./security/01-owasp-review.md) — OWASP Top 10 posture, auth/authz/secrets/data-protection review
- [`02-remediation-plan.md`](./security/02-remediation-plan.md) — P0(done)/P1/P2 backlog, STRIDE, trust-boundary diagram

### `devops/`
- [`01-cicd-and-infra.md`](./devops/01-cicd-and-infra.md) — current Vercel+Railway+CI, target GitHub Actions/ArgoCD/Terraform/Helm/k8s

### `observability/`
- [`01-observability.md`](./observability/01-observability.md) — Prometheus/Grafana/Loki/Tempo/OTel, SLI/SLO/SLA, alerting

### `roadmap/`
- [`01-roadmap.md`](./roadmap/01-roadmap.md) — epics → features → tasks, dependency graph, milestones, 30/90/180/365 gantt
- [`02-implementation-pr-plan.md`](./roadmap/02-implementation-pr-plan.md) — ordered, gated PR plan (unblocked-now vs blocked-on-dependency)

## Current state (grounded)

**Shipped:** M1–M4 (templates → verified-math compiler → Vision Studio → Design Canvas) + a hardening pass — engine test suite + CI, mobile-responsive UI, P0 security (auth throttling, security headers, strict CSP, CORS hardening, CSRF origin-check, email verification + password reset, soft-delete + audit log, config validation), accessibility (focus traps, skip link, dialog roles), bundle splitting, observability seams.

**Not yet built (the forward backlog):** Stripe billing (M5), Postgres migration, Redis, teams/orgs + RBAC, global search, the full observability stack, AWS/EKS/IaC, AI Copilot/Recommendations. Several are gated on external resources (Stripe key, Postgres host, Redis, AWS, Sentry DSN) — the code seams exist for all of them.

## Execution gates (how implementation proceeds)

1. **Analyze → Design → Review → Challenge → Approve.** This knowledge base is the *Design* artifact.
2. Every code change is reviewed by **Principal Reviewer + Security Architect + PM** before merge.
3. **Never blind refactors. Always preserve functionality.** The engine `node:test` suite (the "verified math" moat) must stay green on every PR.
4. Implementation proceeds **incrementally** per `roadmap/02-implementation-pr-plan.md`, lowest-risk / no-external-dependency PRs first.
