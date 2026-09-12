-- Assets a player holds, and the four squads they are arranged into.
--
-- No draft yet. Everybody is given the whole draftable catalogue, because with
-- three testers the interesting question is whether building a squad is any
-- good, not whether choosing twenty-four of them at signup is. The draft is a
-- problem for the day strangers arrive.

CREATE TABLE IF NOT EXISTS player_assets (
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  asset_id    TEXT NOT NULL,
  -- Every asset levels 1-30 on the same curve. Nothing levels faster or
  -- higher than anything else; what differs is the shape it grows into.
  level       INTEGER NOT NULL DEFAULT 1,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, asset_id)
);

-- A slot in a squad. Four squads, six slots each.
--
-- The primary key stops two assets landing in one slot. The second index is
-- the one that matters: an asset may sit in exactly ONE squad, decided by the
-- database rather than by a check, because two drags in the same instant would
-- both read the asset as free and both write it.
CREATE TABLE IF NOT EXISTS squad_slots (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- 'Alpha' | 'Bravo' | 'Charlie' | 'Delta'
  squad     TEXT NOT NULL,
  slot      INTEGER NOT NULL,
  asset_id  TEXT NOT NULL,
  PRIMARY KEY (player_id, squad, slot)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_squad_slots_one_squad_per_asset
  ON squad_slots(player_id, asset_id);
