-- Iron Dominion Arena, phase A (shared/arena.ts, worker/arena.ts).
--
-- arena_days: one Benchmark Squad per world per RST day, generated on the
-- first read of the day from the previous day's strongest attempt snapshot
-- (source_attempt_id is audit only, never shown). PRIMARY KEY makes the
-- first generation the only one.
-- arena_attempts: every settled attempt - the snapshot it fought with, the
-- seed, the score and its itemised breakdown. UNIQUE (player, day, n) is
-- the three-a-day rule.
-- arena_weeks: settlement marker per world per week, written once; the
-- reward grants it produced live in event_reward_grants.
-- No semicolons in these comments: wrangler splits the file on them.
CREATE TABLE arena_days (
  world_id          INTEGER NOT NULL,
  day_key           TEXT NOT NULL,
  week_key          TEXT NOT NULL,
  benchmark         TEXT NOT NULL,
  source_attempt_id TEXT,
  created_at        INTEGER NOT NULL,
  PRIMARY KEY (world_id, day_key)
);

CREATE TABLE arena_attempts (
  id         TEXT PRIMARY KEY,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  world_id   INTEGER NOT NULL,
  day_key    TEXT NOT NULL,
  week_key   TEXT NOT NULL,
  n          INTEGER NOT NULL,
  squad      TEXT NOT NULL,
  snapshot   TEXT NOT NULL,
  seed       INTEGER NOT NULL,
  score      INTEGER NOT NULL,
  breakdown  TEXT NOT NULL,
  outcome    TEXT NOT NULL,
  battle_id  TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (player_id, day_key, n)
);

CREATE INDEX arena_attempts_day ON arena_attempts (world_id, day_key, score);
CREATE INDEX arena_attempts_week ON arena_attempts (world_id, week_key, player_id);

CREATE TABLE arena_weeks (
  world_id   INTEGER NOT NULL,
  week_key   TEXT NOT NULL,
  settled_at INTEGER NOT NULL,
  ranked     INTEGER NOT NULL,
  PRIMARY KEY (world_id, week_key)
);
