-- Loopsy — Postgres init migration (0001)
--
-- Step 1 of the SQLite -> Postgres migration (see docs/database/02-target-postgres.md).
-- Faithful 1:1 port of the current SQLite schema (backend/lib/db/index.js) so
-- existing behaviour is preserved.
--
-- IMPORTANT: identifiers are intentionally UNQUOTED. Postgres folds them to
-- lowercase, which matches the unquoted camelCase the model SQL emits
-- (e.g. `WHERE userId = ?`). The db adapter maps result columns back to
-- camelCase (lib/db/index.js PG_KEYMAP), so the app sees `userId` etc.
-- Do NOT quote these identifiers — that would break the driver-agnostic SQL.
--
-- Conservative types (kept to minimise model changes in the first cutover):
--   * ISO-8601 timestamps stay TEXT.    * JSON payloads stay TEXT.
--   * Boolean-ish flags stay INTEGER 0/1.
-- Follow-up migrations introduce TIMESTAMPTZ, JSONB+GIN, orgs, billing, etc.
--
-- Idempotent: safe to run more than once.

BEGIN;

CREATE TABLE IF NOT EXISTS templates (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  difficulty     TEXT,
  category       TEXT,
  tags           TEXT DEFAULT '[]',
  imageUrl       TEXT,
  hookSize       TEXT,
  yarnWeight     TEXT,
  timeEstimate   TEXT,
  finishedSize   TEXT,
  materials      TEXT DEFAULT '[]',
  notes          TEXT DEFAULT '[]',
  defaultPattern TEXT DEFAULT '[]',
  createdAt      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  passwordHash  TEXT NOT NULL,
  skillLevel    TEXT DEFAULT 'beginner',
  emailVerified INTEGER DEFAULT 0,
  createdAt     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan      TEXT NOT NULL DEFAULT 'free',
  status    TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token     TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patterns (
  id             TEXT PRIMARY KEY,
  userId         TEXT REFERENCES users(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  templateId     TEXT REFERENCES templates(id) ON DELETE SET NULL,
  color          TEXT,
  size           TEXT DEFAULT 'medium',
  steps          TEXT NOT NULL,
  difficulty     TEXT,
  category       TEXT,
  tags           TEXT DEFAULT '[]',
  materials      TEXT DEFAULT '[]',
  hookSize       TEXT,
  yarnWeight     TEXT,
  timeEstimate   TEXT,
  finishedSize   TEXT,
  notes          TEXT DEFAULT '[]',
  promptSummary  TEXT,
  isAIGenerated  INTEGER DEFAULT 0,
  isFallback     INTEGER DEFAULT 0,
  verified       INTEGER DEFAULT 0,
  isExperimental INTEGER DEFAULT 0,
  deletedAt      TEXT,
  createdAt      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  id                 TEXT PRIMARY KEY,
  userId             TEXT REFERENCES users(id) ON DELETE SET NULL,
  patternId          TEXT NOT NULL,
  totalSteps         INTEGER NOT NULL,
  steps              TEXT NOT NULL,
  progressPercentage INTEGER DEFAULT 0,
  createdAt          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS designs (
  id        TEXT PRIMARY KEY,
  userId    TEXT REFERENCES users(id) ON DELETE SET NULL,
  name      TEXT NOT NULL,
  spec      TEXT NOT NULL,
  patternId TEXT,
  deletedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  month     TEXT NOT NULL,
  count     INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (userId, type, month)
);

CREATE TABLE IF NOT EXISTS analytics (
  key   TEXT PRIMARY KEY,
  value INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket      TEXT PRIMARY KEY,
  count       INTEGER NOT NULL DEFAULT 0,
  windowStart TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  actorId    TEXT,
  action     TEXT NOT NULL,
  resource   TEXT,
  resourceId TEXT,
  meta       TEXT,
  ip         TEXT,
  createdAt  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_tokens (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  tokenHash TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  usedAt    TEXT,
  createdAt TEXT NOT NULL
);

-- Indexes (parity with the SQLite schema) + two partial active-row indexes.
CREATE INDEX IF NOT EXISTS idx_progress_patternId    ON progress (patternId);
CREATE INDEX IF NOT EXISTS idx_patterns_userId       ON patterns (userId);
CREATE INDEX IF NOT EXISTS idx_progress_userId       ON progress (userId);
CREATE INDEX IF NOT EXISTS idx_sessions_userId       ON sessions (userId);
CREATE INDEX IF NOT EXISTS idx_users_email           ON users (email);
CREATE INDEX IF NOT EXISTS idx_sessions_token        ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_patterns_templateId   ON patterns (templateId);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_type_month ON ai_usage (userId, type, month);
CREATE INDEX IF NOT EXISTS idx_designs_userId        ON designs (userId);
CREATE INDEX IF NOT EXISTS idx_audit_actor           ON audit_log (actorId);
CREATE INDEX IF NOT EXISTS idx_audit_resource        ON audit_log (resource, resourceId);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user     ON email_tokens (userId, type);
CREATE INDEX IF NOT EXISTS idx_patterns_user_active  ON patterns (userId, createdAt) WHERE deletedAt IS NULL;
CREATE INDEX IF NOT EXISTS idx_designs_user_active   ON designs (userId, updatedAt) WHERE deletedAt IS NULL;

INSERT INTO analytics (key, value) VALUES ('pattern_generations', 0) ON CONFLICT (key) DO NOTHING;
INSERT INTO analytics (key, value) VALUES ('active_users', 0)        ON CONFLICT (key) DO NOTHING;

COMMIT;
