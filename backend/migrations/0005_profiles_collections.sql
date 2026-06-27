-- Community v2: public creator handles + collections (saved-pattern groups).
-- Idempotent: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS handle TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle ON users (handle);

CREATE TABLE IF NOT EXISTS collections (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_patterns (
  collectionId TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  patternId    TEXT NOT NULL,
  createdAt    TEXT NOT NULL,
  PRIMARY KEY (collectionId, patternId)
);

CREATE INDEX IF NOT EXISTS idx_collections_user                 ON collections (userId);
CREATE INDEX IF NOT EXISTS idx_collection_patterns_collection   ON collection_patterns (collectionId);

COMMIT;
