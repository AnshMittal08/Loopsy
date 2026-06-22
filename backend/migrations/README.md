# Loopsy — Database migrations (SQLite → Postgres)

Ordered, idempotent SQL migrations for the Postgres target. Full design:
[`docs/database/02-target-postgres.md`](../../docs/database/02-target-postgres.md).

## Migrations
- `0001_init.sql` — faithful 1:1 port of the current SQLite schema (13 tables,
  parity indexes, real FKs). **Identifiers are unquoted on purpose** so Postgres
  folds them to lowercase, matching the unquoted camelCase the app SQL emits; the
  `lib/db` adapter maps result columns back to camelCase. Do not quote them.
- `0002_seed_templates.sql` — the 22 canonical templates (generated from
  `lib/models/templateModel`). On SQLite these seed automatically at boot; on
  Postgres this migration seeds them.

## How it works (the dual-driver adapter)
`lib/db/index.js` exposes one async statement interface (`prepare().get/all/run`,
`exec`, `withTransaction`). With **no `DATABASE_URL`** it uses `better-sqlite3`
(the default — local dev, tests, and the current production). With **`DATABASE_URL`
set** it uses a `pg` Pool, translating `?` → `$n` and remapping lowercase columns
back to camelCase. The engine never touches the DB, so it is untouched.

## Deploy to Postgres (Railway / Neon)
The app keeps using SQLite until `DATABASE_URL` is set, so this is a safe cutover:

1. **Reset + apply the schema** (the columns are lowercase now; if you applied an
   earlier camelCase version, drop first):
   ```sql
   -- in the Neon SQL editor (or psql):
   DROP SCHEMA public CASCADE; CREATE SCHEMA public;
   ```
   ```bash
   cd backend
   DATABASE_URL="postgresql://…?sslmode=require" npm run migrate   # applies 0001 + 0002
   ```
2. **Point the app at Postgres**: set `DATABASE_URL` in the Railway backend env,
   redeploy. On boot it now uses `pg`.
3. **Verify**: sign up, generate a pattern, open the tracker, toggle a step.
4. **Roll back instantly** if needed: unset `DATABASE_URL` → back to SQLite.

> Note: this sandbox's network egress blocks Neon, so the Postgres path is
> verified by the SQLite test harness (identical code path) + your Railway
> smoke test, not from CI here.
