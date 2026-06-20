# Loopsy — Security Review (Phase 10)

> OWASP Top 10 (2021) posture review, plus dedicated deep-dives on
> authentication, authorization, session management, secrets, data protection,
> audit, and a compliance roadmap.
>
> **Scope:** the live web product (`backend/` Next.js API + `frontend/` SPA).
> Stripe / billing (M5) is **[TARGET]** — not yet built.
>
> **Recent context:** a **P0 hardening pass has already shipped**. Items it fixed
> are tagged **(Fixed this pass)** below; everything still outstanding is tagged
> **(Open)** and tracked in `02-remediation-plan.md`.

Legend: ✅ controlled · ⚠️ partial / compensating control only · ❌ gap

---

## 1. OWASP Top 10 (2021) — posture table

| # | Risk | Posture | Grounded evidence | Status |
|---|------|---------|-------------------|--------|
| A01 | Broken Access Control | ⚠️ | Per-handler ownership via `requireAuthenticatedUser()` + `userId` scoping (`backend/lib/auth/session.js:96`); soft-delete reads filter `deletedAt`. **No central policy / RBAC layer** yet. | Partially Fixed this pass; central authz **Open** |
| A02 | Cryptographic Failures | ⚠️ | Passwords: Node `scrypt` (N=16384) + per-user 16-byte salt + `crypto.timingSafeEqual` (`session.js:13-25`). Tokens: 32-byte CSPRNG session token; SHA-256-hashed single-use email/reset tokens. Cookie `Secure` in prod (`session.js:76`). **At-rest encryption only if the SQLite volume is encrypted; no pepper/KMS.** | Hashing Fixed this pass; pepper/KMS **Open** |
| A03 | Injection | ✅ | Parameterized `better-sqlite3` prepared statements throughout `lib/models/*`. No string-built SQL. CSP blocks inline script (`frontend/vercel.json:14`, `script-src 'self' 'wasm-unsafe-eval'`). | Fixed this pass |
| A04 | Insecure Design | ⚠️ | Design Spec is the single contract; **the engine owns all arithmetic — an LLM never computes stitch counts** (CLAUDE.md decision 10). Throttling + audit by design. **No formal threat model** (now drafted in `02-remediation-plan.md`); no `zod` edge validation. | Improved; threat model + edge validation **Open** |
| A05 | Security Misconfiguration | ✅ | Security headers on API (`backend/next.config.js:10-16`) and SPA (`vercel.json:16-20`): nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, HSTS. Strict CSP on SPA. CORS pinned to `FRONTEND_URL`, **no wildcard**, credentialed only for that origin (`next.config.js:24-30`). Boot-time `validateConfig()` (`lib/config.js:15`). | Fixed this pass |
| A06 | Vulnerable & Outdated Components | ❌ | No Dependabot / `npm audit` gate in CI (`.github/workflows/ci.yml` runs tests + build only). | **Open** |
| A07 | Identification & Authentication Failures | ✅⚠️ | DB-backed rolling-window throttling (`rate_limits`, `rateLimitModel.peek/hit/clear`); login 5/(ip,email)+20/ip per 15m, cleared on success; **identical 401 for unknown-vs-wrong-password (no enumeration)**; signup 10/ip/hr; forgot 5/ip/15m; reset 10/ip/15m. Email verification required. **No MFA.** | Throttling/anti-enumeration Fixed this pass; MFA **Open** |
| A08 | Software & Data Integrity Failures | ⚠️ | CSP `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`; SPA script-src `'self'`. No package signing / SLSA provenance; lockfiles present but no CI integrity gate. | Partially Fixed this pass; supply-chain **Open** |
| A09 | Security Logging & Monitoring Failures | ⚠️ | Structured logger (`lib/logger.js`); append-only `audit_log` (actorId/action/resource/ip via `auditModel`); `auth.cross_site_blocked` logged (`request.js:93`). **No Sentry / alerting / SIEM.** | Audit Fixed this pass; alerting **Open** |
| A10 | Server-Side Request Forgery (SSRF) | ✅ | No user-supplied URL fetching. Vision images are inline pass-through bytes to the model provider; the app does not fetch arbitrary URLs server-side. | N/A — low surface |

---

## 2. Authentication review

**Implemented (Fixed this pass)**
- **Password storage** — `hashPassword` / `verifyPassword` in
  `backend/lib/auth/session.js:13-25`: `scrypt` (64-byte derived key) with a
  per-user random 16-byte salt, stored as `salt:hash`; verification uses
  `crypto.timingSafeEqual` to avoid timing leaks.
- **Brute-force throttling** — DB-backed rolling windows in the `rate_limits`
  table via `lib/models/rateLimitModel.js` (`peek` / `hit` / `clear`). Login
  caps: 5 failed attempts per `(ip,email)` and 20 per `ip` / 15 min; a
  successful sign-in `clear`s the account bucket. Signup 10/ip/hr,
  forgot-password 5/ip/15m, reset 10/ip/15m.
- **No account enumeration** — login returns the **same 401** whether the
  account is unknown or the password is wrong; forgot-password returns a generic
  response regardless of account existence.
- **Email verification** — required via single-use, SHA-256-hashed, expiring
  tokens in `email_tokens` (`emailTokenModel`); `users.emailVerified` tracks
  state. Delivery is provider-agnostic (`lib/email/mailer.js`): logs the link
  with no provider configured, sends via Resend when `RESEND_API_KEY` is set.

**Open / [TARGET]**
- **MFA** — no second factor for any account, including elevated/admin roles. **[TARGET]**
- **Password hashing upgrade** — `scrypt` is acceptable; evaluate **Argon2id**
  and a server-side **pepper** held in a secrets manager. **[TARGET]**
- **Session rotation on password change** — not yet enforced; a stolen session
  survives a reset. **[TARGET]**

---

## 3. Authorization review

**Implemented**
- Every privileged route calls `requireAuthenticatedUser(request)`
  (`session.js:96-106`), which returns a `401` when unauthenticated.
- Resource ownership is enforced by scoping queries on `userId` (`patterns`,
  `progress`, `designs`). Reads filter out soft-deleted rows (`deletedAt`).
- Destructive/privileged actions append to the append-only `audit_log`.

**Open / [TARGET]**
- **No central policy layer.** Authorization is per-handler; there is no single
  `can(user, action, resource)` decision point, so a missed check in a new route
  is the most likely future access-control bug (A01). **[TARGET]**
- **No RBAC** for Team / Admin / Enterprise roles. Needed before multi-user
  workspaces or an admin console ship. **[TARGET]**

---

## 4. Session management

| Property | Value | Evidence |
|----------|-------|----------|
| Cookie name | `loopsy_session` (legacy `stitchflow_session` still read + cleared) | `session.js:7-10,84-92` |
| Token | 32-byte CSPRNG (`crypto.randomBytes(32)`), opaque, server-side in `sessions` table | `session.js:35` |
| Flags | `httpOnly`, `SameSite=Lax`, `Secure` in prod, `path=/` | `session.js:72-81` |
| TTL | 30 days; `expires` set on the cookie and the DB row | `session.js:11,28-38` |
| Expiry sweep | Expired sessions rejected/cleared on read (`getSessionByToken`) | `session.js:60` |
| Logout | `destroySessionForRequest` deletes the DB row; cookie cleared (incl. legacy) | `session.js:83-113` |

**Open / [TARGET]:** rotate the session token on password change and on
privilege elevation; consider an idle-timeout shorter than the 30-day absolute
TTL. **[TARGET]**

---

## 5. Secrets management

- **Today:** all secrets via environment variables only — `ANTHROPIC_API_KEY`,
  `RESEND_API_KEY`, `FRONTEND_URL`. `validateConfig()` (`lib/config.js:15`)
  fails **loud, not fatal** at boot if `FRONTEND_URL` is missing in production,
  and warns when `ANTHROPIC_API_KEY` is unset.
- **No secrets manager**, no rotation policy, no per-environment KMS. **[TARGET]**
  Move to AWS Secrets Manager (or platform equivalent) with rotation; introduce
  a password **pepper** stored there.

---

## 6. Data protection & encryption

- **In transit:** HSTS on both tiers; CSP `upgrade-insecure-requests`; cookies
  `Secure` in prod.
- **At rest:** SQLite `data.db`. **Encrypted only if the underlying volume is** —
  there is no application-level field encryption. **[TARGET]** for regulated /
  Enterprise data: volume encryption guarantee + field-level encryption for any
  future PII beyond email.
- **Privacy invariant — images are NEVER stored.** Vision Studio passes photo
  bytes through to the model provider and discards them; nothing is written to
  disk or DB (CLAUDE.md decision 8). This is a load-bearing GDPR/CCPA promise —
  do not regress it.
- **Injection-safe storage:** parameterized prepared statements everywhere.

---

## 7. Audit trails

- Append-only `audit_log` (`auditModel`) records `actorId`, `action`,
  `resource`, and `ip` for privileged/destructive actions.
- Soft-delete (`deletedAt` on `patterns` / `designs`) makes deletes recoverable
  and auditable rather than destructive.
- `auth.cross_site_blocked` and config errors surface through the structured
  logger (`lib/logger.js`).
- **Open / [TARGET]:** ship logs + audit events to a retained, tamper-evident
  store; add Sentry + alerting on auth anomalies (lockouts, cross-site blocks).

---

## 8. CSRF posture

- **Primary control:** `SameSite=Lax` session cookie.
- **Defense-in-depth:** `isCrossSiteRequest()` (`backend/lib/auth/request.js:82`)
  checks `Origin`/`Referer` against a normalized allowlist built from
  `FRONTEND_URL` (comma-separated; `*.vercel.app` preview-tolerant). It **fails
  closed** on a mismatched Origin and **fails open only when no allowlist can be
  determined** (misconfigured deploy) so a real deployment is never locked out;
  blocks are logged as `auth.cross_site_blocked`.
- **Open / [TARGET]:** add a full double-submit / synchronizer CSRF token for
  state-changing POSTs as a third layer independent of header trust. **[TARGET]**

---

## 9. Compliance roadmap

- **GDPR / CCPA — data subject rights**
  - *Right to erasure:* the soft-delete → purge model is the foundation. **[TARGET]**
    build a scheduled hard-purge job that removes `deletedAt` rows after a
    retention window, plus an account-deletion endpoint that cascades.
  - *Right to access / portability:* **[TARGET]** a per-user **data export**
    (patterns, designs, progress, account) as JSON.
  - *Data minimization:* the "images never stored" invariant already satisfies
    minimization for the highest-risk input. Keep PII limited to email.
- **SOC 2 path (Enterprise)** — **[TARGET]**: centralized authz + RBAC,
  secrets manager with rotation, Sentry + alerting/retained audit log,
  dependency scanning in CI, and a documented access-review + incident-response
  process. The audit_log and config validation are early building blocks.

---

## What the P0 pass fixed (summary)

Password hashing with salt + constant-time compare · DB-backed login/signup/
reset throttling with anti-enumeration · CSRF origin-check layered on
SameSite=Lax · full security-header set on both tiers · strict SPA CSP with no
inline script · CORS pinned to `FRONTEND_URL` (no wildcard) · single-use hashed
email-verification + password-reset tokens · soft-delete + append-only audit
log · boot-time config validation.

**Still open (see `02-remediation-plan.md`):** MFA · central authz + RBAC ·
secrets manager · Sentry + alerting · `zod` edge validation · Dependabot +
`npm audit` in CI · double-submit CSRF token · session rotation on password
change · Argon2id/pepper evaluation.

---

*Reviewed by: Principal Reviewer / Security Architect / Backend Architect*
