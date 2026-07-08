-- First-party error log surfaced on /admin.
-- Idempotent: IF NOT EXISTS.
BEGIN;

CREATE TABLE IF NOT EXISTS error_log (
  id         TEXT PRIMARY KEY,
  route      TEXT NOT NULL,
  method     TEXT,
  message    TEXT NOT NULL,
  stack      TEXT,
  statusCode INTEGER,
  userId     TEXT,
  createdAt  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_log_created ON error_log (createdAt);

COMMIT;
