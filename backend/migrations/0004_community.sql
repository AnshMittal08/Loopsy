-- Community catalog: publish patterns + star/save them.
-- Idempotent: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
BEGIN;

ALTER TABLE patterns ADD COLUMN IF NOT EXISTS publishedAt TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS starCount INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS pattern_stars (
  userId    TEXT NOT NULL,
  patternId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (userId, patternId)
);

CREATE INDEX IF NOT EXISTS idx_pattern_stars_pattern ON pattern_stars (patternId);
CREATE INDEX IF NOT EXISTS idx_pattern_stars_user    ON pattern_stars (userId);

COMMIT;
