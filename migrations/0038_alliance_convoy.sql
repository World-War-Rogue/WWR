-- The Season 1 Alliance Convoy: a free Daily Convoy and one paid Contract
-- Convoy per alliance per day, each with five cargo trucks, a leadership-
-- chosen Guardian and a six-asset escort. Rules in shared/allianceConvoy.ts.
-- No attack, raid or target table exists: a Season 1 Convoy cannot be
-- attacked, and Season 2's attacks are a separate future migration.

CREATE TABLE alliance_convoys (
  id            TEXT PRIMARY KEY,
  alliance_id   TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  world_id      INTEGER NOT NULL,
  day_key       TEXT NOT NULL,
  -- 'daily' | 'contract'
  kind          TEXT NOT NULL,
  starts_at     INTEGER NOT NULL,
  locks_at      INTEGER NOT NULL,
  -- The route the formation animates along, as JSON {from:{x,y},to:{x,y}}.
  route         TEXT NOT NULL,
  guardian_id   TEXT REFERENCES players(id),
  -- The six-asset escort, as JSON [{slot,assetId}], once the Guardian sets it.
  guard         TEXT,
  created_at    INTEGER NOT NULL
);
-- One Daily and one Contract per alliance per day: the join lazily creates
-- the row, and this makes a second creation a no-op.
CREATE UNIQUE INDEX alliance_convoys_one ON alliance_convoys (alliance_id, day_key, kind);
CREATE INDEX alliance_convoys_world ON alliance_convoys (world_id, day_key);

-- One row per member who boarded, the PRIMARY KEY enforcing one truck each.
CREATE TABLE convoy_truck_members (
  convoy_id  TEXT NOT NULL REFERENCES alliance_convoys(id) ON DELETE CASCADE,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  truck      INTEGER NOT NULL,
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (convoy_id, player_id)
);
CREATE INDEX convoy_truck_members_truck ON convoy_truck_members (convoy_id, truck);
