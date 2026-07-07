-- In-app notifications (stars/comments on your patterns).
-- Idempotent: IF NOT EXISTS.
BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id           TEXT PRIMARY KEY,
  userId       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actorId      TEXT,
  type         TEXT NOT NULL,
  resourceType TEXT,
  resourceId   TEXT,
  message      TEXT NOT NULL,
  readAt       TEXT,
  createdAt    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (userId, readAt);

COMMIT;
