-- OAuth identities: one user can sign in with password AND providers (Google…).
-- Idempotent: IF NOT EXISTS.
BEGIN;

CREATE TABLE IF NOT EXISTS user_identities (
  id             TEXT PRIMARY KEY,
  userId         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider       TEXT NOT NULL,
  providerUserId TEXT NOT NULL,
  email          TEXT,
  createdAt      TEXT NOT NULL,
  UNIQUE (provider, providerUserId)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user ON user_identities (userId);

COMMIT;
