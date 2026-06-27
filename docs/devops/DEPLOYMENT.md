# Loopsy — Deployment & Ops Runbook

> **Living document.** Every branch that needs an env var, a Postgres migration,
> or any server-side change records it under **[Pending deploy actions](#pending-deploy-actions)**
> _before_ it merges. After you apply the action on the live server, tick it off
> and move it to **[Applied history](#applied-history)**. Keeping this current is
> part of "done" for any backend change.

- **Backend** (`backend/`): Next.js API, deployed on **Railway** → `https://<api>.railway.app`
- **Frontend** (`frontend/`): React SPA, deployed on **Vercel**; proxies `/api/*` → Railway via `vercel.json`
- **Database**: **Neon** Postgres in prod (`DATABASE_URL` set) / `better-sqlite3` locally (unset)

---

## 1. Pending deploy actions

These must be applied to the live Railway/Neon/Stripe/Vercel servers. Tick when done.

### From PR #34 — `feat/account-management` (billing)
- [ ] **Neon migration**: run `npm run migrate` → applies `0003_billing.sql`
      (adds `subscriptions.stripeCustomerId`).
- [ ] **Railway env** (optional — billing stays dormant + honest-503 until all are set):
  - [ ] `STRIPE_SECRET_KEY` — Stripe secret API key (`sk_test_…` / `sk_live_…`)
  - [ ] `STRIPE_WEBHOOK_SECRET` — signing secret of the webhook endpoint (`whsec_…`)
  - [ ] `STRIPE_PRICE_MAKER_PRO` — Stripe Price id for the Maker Pro plan (`price_…`)
  - [ ] `STRIPE_PRICE_CREATOR` — Stripe Price id for the Creator plan (`price_…`)
- [ ] **Stripe dashboard**: create a webhook endpoint → `https://<api>.railway.app/api/billing/webhook`
      subscribed to `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

### From `feat/community-catalog` (community)
- [ ] **Neon migration**: run `npm run migrate` → applies `0004_community.sql`
      (adds `patterns.publishedAt`, `patterns.starCount`, and the `pattern_stars` table).
- [ ] No new env vars.

### From `feat/community-catalog` (community v2 — profiles + collections)
- [ ] **Neon migration**: run `npm run migrate` → applies `0005_profiles_collections.sql`
      (adds `users.handle` + unique index, and the `collections` + `collection_patterns` tables).
- [ ] **Handle backfill**: existing users get a unique `handle` lazily on their next
      `GET /api/me` (self-healing — no manual backfill needed). New signups get one at creation.
- [ ] No new env vars.

> `npm run migrate` is idempotent and applies **all** pending `.sql` files in order,
> so a single run from a host that can reach Neon covers both `0003` and `0004`.

---

## 2. Environment variables

Apply on **Railway** (backend) unless noted. SQLite local dev needs none of these.

### Required in production
| Var | Purpose | Notes |
|-----|---------|-------|
| `FRONTEND_URL` | CORS allowlist + CSRF origin-check + email link base | Comma-separated list allowed. **Fails closed** without it (`lib/config.js` logs loudly). `*.vercel.app` previews auto-tolerated. |
| `DATABASE_URL` | Switches the DB adapter to Postgres | Unset → SQLite. Neon URL includes `?sslmode=require`. **Never commit it.** |
| `NODE_ENV` | `production` on Railway | Drives prod-only security headers + config validation. |

### Billing (optional — feature dormant until ALL four set)
| Var | Purpose |
|-----|---------|
| `STRIPE_SECRET_KEY` | Stripe API key; gates the whole billing surface (503 until set) |
| `STRIPE_WEBHOOK_SECRET` | Verifies webhook signatures |
| `STRIPE_PRICE_MAKER_PRO` | Price id → Maker Pro plan |
| `STRIPE_PRICE_CREATOR` | Price id → Creator plan |

### AI generation (recommended)
| Var | Purpose | Notes |
|-----|---------|-------|
| `ANTHROPIC_API_KEY` | Claude generation (M2/M3 compiler-first) | Unset → falls back to Ollama, else honest `AI_UNAVAILABLE`. |
| `OLLAMA_URL` | Local LLM fallback endpoint | Only used when `ANTHROPIC_API_KEY` is unset. |

### Email (optional — links log to console without it)
| Var | Purpose |
|-----|---------|
| `RESEND_API_KEY` | Send verification / password-reset email via Resend |
| `EMAIL_FROM` | From-address for Resend (set alongside the key) |

### Operational / tuning (all optional, sane defaults)
| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3000` | Next.js start port |
| `PG_POOL_MAX` | `10` | Postgres pool size |
| `LOG_LEVEL` | env-based | Structured logger verbosity |
| `ALLOWED_ORIGIN_SUFFIXES` | `.vercel.app` auto | Extra CSRF-allowed host suffixes (comma-separated) |
| `DB_PATH` | `backend/data.db` | SQLite file location (local/dev only) |
| `BACKUP_DIR` | `backend/backups` | `npm run backup` output dir (SQLite only) |

### Frontend (Vercel)
- No build-time `VITE_*` vars required today. API base is the `/api/*` rewrite in `vercel.json`
  → point that rewrite at the Railway URL.

---

## 3. Postgres migrations

Migrations live in `backend/migrations/`, applied in filename order by `scripts/migrate.js`.
**All are idempotent** (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `ON CONFLICT`), so
re-running is always safe.

```bash
cd backend
DATABASE_URL=postgresql://…  npm run migrate   # or put DATABASE_URL in backend/.env (gitignored)
npm run smoke:pg                               # optional: verify the live DB end-to-end
```

> Run from a host that can reach Neon (your laptop, Railway shell, or CI) — **not** a
> sandbox whose egress blocks the DB host.

| File | Adds |
|------|------|
| `0001_init.sql` | Full base schema (lowercase identifiers; adapter remaps to camelCase) |
| `0002_seed_templates.sql` | 22 seed templates |
| `0003_billing.sql` | `subscriptions.stripeCustomerId` |
| `0004_community.sql` | `patterns.publishedAt`, `patterns.starCount`, `pattern_stars` table |
| `0005_profiles_collections.sql` | `users.handle` + unique index, `collections` + `collection_patterns` tables |

**Note:** the SQLite adapter (`lib/db/index.js`) runs its own idempotent `ALTER TABLE`
migrations at boot, so local dev needs no migrate step — but every schema change must be
mirrored in **both** `lib/db/index.js` (SQLite) **and** a new `migrations/000N_*.sql` (Postgres),
plus a `PG_KEYMAP` entry if the new column is camelCase.

---

## 4. First-time prod bring-up checklist

1. **Neon**: create project → copy the pooled `DATABASE_URL` (`?sslmode=require`).
2. **Railway**: set `DATABASE_URL`, `FRONTEND_URL`, `NODE_ENV=production` (+ optional groups above).
3. Run `npm run migrate` against Neon (applies all `000N` files). Optionally `npm run smoke:pg`.
4. **Vercel**: deploy `frontend/`; point the `vercel.json` `/api/*` rewrite at the Railway URL.
5. (Optional) configure Stripe + Resend env and the Stripe webhook endpoint.
6. Verify: `GET /api/templates` returns 22, signup → login → `/api/me` round-trips.

---

## 5. Applied history

Move items here (with a date) once applied to the live servers.

_Nothing applied yet — fill in as you deploy._
