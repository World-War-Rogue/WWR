-- Season 1 Daily Operations (shared/season1Ops.ts, worker/dailyOps.ts).
--
-- daily_ops: one row per (player, RST day, lane) the moment the lane is done.
-- The primary key is the idempotency: a second qualifying action the same day
-- is INSERT OR IGNORE and changes nothing.
--
-- daily_meter: settled production time per (player, RST day), for the
-- Industry lane, which completes at one hour.
--
-- event_reward_grants: every reward the season pays, once. The id is the
-- idempotency key ('daily-lane:<player>:<day>:<lane>', 'daily-cache:<player>:<day>')
-- and the row is written in the same transaction as the wallet and stock
-- changes it describes. The Reports screen reads this table; nothing is
-- derived from client state.
--
-- marches.contract: 1 when an attack is a neutral contract against a Dominion
-- outpost (a farm bot), which counts for the Cooperation lane and never for
-- Engagement.
-- No semicolons in these comments: wrangler splits the file on them.
CREATE TABLE daily_ops (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  day_key   TEXT NOT NULL,
  lane      TEXT NOT NULL,
  done_at   INTEGER NOT NULL,
  PRIMARY KEY (player_id, day_key, lane)
);

CREATE TABLE daily_meter (
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  day_key     TEXT NOT NULL,
  produced_ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, day_key)
);

CREATE TABLE event_reward_grants (
  id         TEXT PRIMARY KEY,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  source     TEXT NOT NULL,
  season     INTEGER NOT NULL,
  week       INTEGER NOT NULL,
  day_key    TEXT NOT NULL,
  credits    INTEGER NOT NULL DEFAULT 0,
  fuel       INTEGER NOT NULL DEFAULT 0,
  steel      INTEGER NOT NULL DEFAULT 0,
  munitions  INTEGER NOT NULL DEFAULT 0,
  alloy      INTEGER NOT NULL DEFAULT 0,
  detail     TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX event_reward_grants_player ON event_reward_grants (player_id, created_at);

ALTER TABLE marches ADD COLUMN contract INTEGER NOT NULL DEFAULT 0;
