-- Account deletion tombstone + captured error log.
-- Idempotent: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS deletedAt TEXT;

CREATE TABLE IF NOT EXISTS error_log (
  id        TEXT PRIMARY KEY,
  route     TEXT,
  method    TEXT,
  message   TEXT NOT NULL,
  stack     TEXT,
  userId    TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_log_created ON error_log (createdAt);

COMMIT;
