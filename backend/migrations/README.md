# Loopsy — Database migrations (SQLite → Postgres)

Ordered, idempotent SQL migrations for the Postgres target. Full design:
[`docs/database/02-target-postgres.md`](../../docs/database/02-target-postgres.md).

## Migrations
- `0001_init.sql` — **faithful 1:1 port** of the current SQLite schema, so existing
  data migrates cleanly and behaviour is preserved. Keeps TEXT timestamps/JSON and
  INTEGER flags to minimise model changes in the first cutover.

## Migration plan (incremental, behaviour-preserving)
1. **`0001_init.sql`** — stand up the Postgres schema (done; this dir). ✅
2. **Async data layer** — wrap the current synchronous `better-sqlite3` model
   functions (`lib/models/*`) in `async` signatures and `await` them in routes.
   Zero behaviour change; this is the de-risking refactor that makes the driver
   swap a non-event (the engine never touches the DB, so it is untouched).
3. **`pg` driver** — add a Postgres driver behind `lib/db` selected by
   `DATABASE_URL` (falls back to SQLite locally/in tests). Translate `?` →
   `$n` placeholders; keep one prepared-statement seam.
4. **Data backfill + cutover** — export SQLite → import to Postgres, verify row
   counts/checksums, then flip `DATABASE_URL`. Reversible (SQLite retained).
5. **Optimisation migrations** — `0002+`: TIMESTAMPTZ, JSONB + GIN, real BOOLEANs,
   orgs/multi-tenancy, billing mirror, partitioning, pgvector.

## How to run (once a host + DATABASE_URL exist)
```bash
# example with psql; a Node runner will be added in step 3
psql "$DATABASE_URL" -f backend/migrations/0001_init.sql
```

## What we need to proceed
A Postgres `DATABASE_URL` (e.g. from a free **Neon** project:
`postgresql://user:pass@host/db?sslmode=require`). With it, steps 2–4 land as
reviewed PRs and we verify the full app against real Postgres before cutover.
