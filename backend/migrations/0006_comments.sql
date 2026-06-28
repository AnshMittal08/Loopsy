-- Community depth: comments on published patterns (flat, soft-deleted).
-- Idempotent: IF NOT EXISTS.
BEGIN;

CREATE TABLE IF NOT EXISTS pattern_comments (
  id        TEXT PRIMARY KEY,
  patternId TEXT NOT NULL,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body      TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  deletedAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_pattern_comments_pattern ON pattern_comments (patternId);

COMMIT;
