-- Wave 4: UGC abuse reports + creator bio.
-- Idempotent: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
BEGIN;

CREATE TABLE IF NOT EXISTS reports (
  id           TEXT PRIMARY KEY,
  reporterId   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resourceType TEXT NOT NULL,
  resourceId   TEXT NOT NULL,
  reason       TEXT NOT NULL,
  detail       TEXT,
  status       TEXT NOT NULL DEFAULT 'open',
  createdAt    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_resource ON reports (resourceType, resourceId);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports (status);

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

COMMIT;
