-- Dominion Warfront: the weekly alliance competition, and the Operations
-- Treasury its pools are paid into.
--
-- warfront_points is the itemised ledger: one row per scoring action, its
-- id the idempotency key (INSERT OR IGNORE). warfront_days is the per-member
-- per-day tally the standings read - raw metric totals, capped at read time
-- by shared/warfront.ts. A day has one row per alliance the member scored
-- for ('' when the points counted for no alliance: not a member, or not yet
-- 48 hours in).

CREATE TABLE warfront_points (
  id          TEXT PRIMARY KEY,
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  world_id    INTEGER NOT NULL,
  day_key     TEXT NOT NULL,
  week_key    TEXT NOT NULL,
  alliance_key TEXT NOT NULL DEFAULT '',
  metric      TEXT NOT NULL,
  points      INTEGER NOT NULL,
  source      TEXT NOT NULL,
  detail      TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX warfront_points_player_day ON warfront_points (player_id, day_key);

CREATE TABLE warfront_days (
  player_id    TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  day_key      TEXT NOT NULL,
  alliance_key TEXT NOT NULL DEFAULT '',
  world_id     INTEGER NOT NULL,
  week_key     TEXT NOT NULL,
  assault      INTEGER NOT NULL DEFAULT 0,
  operations   INTEGER NOT NULL DEFAULT 0,
  support      INTEGER NOT NULL DEFAULT 0,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (player_id, day_key, alliance_key)
);
CREATE INDEX warfront_days_week ON warfront_days (world_id, week_key);

-- One row per settled week per world; the settlement runs once.
CREATE TABLE warfront_weeks (
  world_id   INTEGER NOT NULL,
  week_key   TEXT NOT NULL,
  settled_at INTEGER NOT NULL,
  ranked     INTEGER NOT NULL,
  PRIMARY KEY (world_id, week_key)
);

-- The frozen final table of a settled week, for the screen's "last week".
CREATE TABLE warfront_results (
  world_id     INTEGER NOT NULL,
  week_key     TEXT NOT NULL,
  alliance_id  TEXT NOT NULL,
  rank         INTEGER NOT NULL,
  tag          TEXT NOT NULL,
  name         TEXT NOT NULL,
  score        INTEGER NOT NULL,
  contributors INTEGER NOT NULL,
  division     TEXT NOT NULL,
  PRIMARY KEY (world_id, week_key, alliance_id)
);

-- The Operations Treasury. Balance plus an open ledger; nothing leaves it
-- except through a posted alliance operation (none exist yet - the spend
-- path lands with them).
CREATE TABLE alliance_treasury (
  alliance_id TEXT PRIMARY KEY REFERENCES alliances(id) ON DELETE CASCADE,
  credits     INTEGER NOT NULL DEFAULT 0,
  fuel        INTEGER NOT NULL DEFAULT 0,
  steel       INTEGER NOT NULL DEFAULT 0,
  munitions   INTEGER NOT NULL DEFAULT 0,
  alloy       INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE alliance_treasury_ledger (
  id          TEXT PRIMARY KEY,
  alliance_id TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  credits     INTEGER NOT NULL DEFAULT 0,
  fuel        INTEGER NOT NULL DEFAULT 0,
  steel       INTEGER NOT NULL DEFAULT 0,
  munitions   INTEGER NOT NULL DEFAULT 0,
  alloy       INTEGER NOT NULL DEFAULT 0,
  detail      TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX alliance_treasury_ledger_alliance ON alliance_treasury_ledger (alliance_id, created_at);
