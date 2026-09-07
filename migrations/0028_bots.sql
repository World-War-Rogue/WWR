-- Bot accounts: farm bots that populate a server and test bots a harness
-- drives. One row per bot beside its ordinary players row, and the players
-- row carries role 'farmbot' or 'testbot'.
--
-- kind        'farm' or 'test'
-- seed        drives the farm bot's deterministic growth plan (worker/bots.ts)
-- ceiling     the highest level a farm bot may reach this season
-- planted_at  when its clock started - growth is a function of (now - planted_at)
-- grown_at    the last time its rows were brought up to date (0 = never)
--
-- No semicolons in these comments: wrangler splits the file on them.
CREATE TABLE bots (
  player_id  TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  seed       INTEGER NOT NULL,
  ceiling    INTEGER NOT NULL,
  planted_at INTEGER NOT NULL,
  grown_at   INTEGER NOT NULL DEFAULT 0
);

-- The viewport read asks for stale farm bots inside a rectangle.
CREATE INDEX bots_kind_grown ON bots (kind, grown_at);
