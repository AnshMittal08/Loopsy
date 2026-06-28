-- Learning Centre: per-user read + bookmark state for technique guides.
-- guideSlug is content-defined (frontend), so this stores slug strings only.
-- Idempotent: IF NOT EXISTS.
BEGIN;

CREATE TABLE IF NOT EXISTS learning_progress (
  userId     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guideSlug  TEXT NOT NULL,
  readAt     TEXT,
  bookmarked INTEGER NOT NULL DEFAULT 0,
  updatedAt  TEXT NOT NULL,
  PRIMARY KEY (userId, guideSlug)
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON learning_progress (userId);

COMMIT;
