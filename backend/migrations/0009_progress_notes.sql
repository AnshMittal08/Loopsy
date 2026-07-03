-- Wave 3: per-project maker notes on the tracker.
-- Idempotent: ADD COLUMN IF NOT EXISTS.
BEGIN;

ALTER TABLE progress ADD COLUMN IF NOT EXISTS notes TEXT;

COMMIT;
