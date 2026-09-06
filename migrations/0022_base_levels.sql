-- Base levels v2: the Command Center and the five asset buildings.
--
-- The legacy `buildings` / `build_jobs` tables belong to the old text-menu
-- base and are wiped by the test reset. These are the v2 tables: one row per
-- levelled building, and one job table whose completes_at is the contract.
-- A partial unique index keeps one running job per base, which is the queue
-- rule until the Second Engineer Team exists.

CREATE TABLE IF NOT EXISTS base_levels (
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  building   TEXT NOT NULL,
  level      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, building),
  CHECK (level >= 0 AND level <= 50)
);

CREATE TABLE IF NOT EXISTS base_jobs (
  id            TEXT PRIMARY KEY,
  player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  building      TEXT NOT NULL,
  to_level      INTEGER NOT NULL,
  started_at    INTEGER NOT NULL,
  completes_at  INTEGER NOT NULL,
  -- Set when the finished job was folded into base_levels. Settle-on-read:
  -- any read of the base past completes_at applies it, once.
  applied_at    INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_base_jobs_one_running
  ON base_jobs(player_id) WHERE applied_at IS NULL;
