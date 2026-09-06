-- BUILDING RESOURCES v1: all sixteen buildings level and cost resources.
--
-- base_levels / base_jobs (0022) now hold every building, not just the six.
-- The one-job-per-base index becomes one-job-per-BUILDING; how many may run
-- at once is the queue count (one, or two with the Second Engineer Team) and
-- is enforced by the server inside the insert.

DROP INDEX IF EXISTS idx_base_jobs_one_running;
CREATE UNIQUE INDEX IF NOT EXISTS idx_base_jobs_one_per_building
  ON base_jobs(player_id, building) WHERE applied_at IS NULL;

-- The Second Engineer Team: a permanent second build queue. The instant it
-- is ready; NULL means never bought. Absolute, like every timer.
ALTER TABLE players ADD COLUMN second_team_at INTEGER;

-- Resources bought at the Depot, tallied per game day per resource so the
-- daily cap holds however the Tokens and Credits were mixed.
CREATE TABLE IF NOT EXISTS depot_purchases (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  day       INTEGER NOT NULL,
  resource  TEXT NOT NULL,
  amount    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, day, resource)
);

-- A revision on the stock, claimed by every spend the way wallet_rev is
-- claimed by every purchase: the debit succeeds only against the revision it
-- read, so two spends racing from the same stock cannot both land.
ALTER TABLE bases ADD COLUMN stock_rev INTEGER NOT NULL DEFAULT 0;
