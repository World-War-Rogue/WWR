-- Where each building stands on a player's base board.
--
-- Placement is visual only: nothing reads this but the base screen. Two
-- uniqueness rules, both indexes rather than checks, because the database is
-- the only thing that can hold them under two tabs pressing Arrange at once:
-- a building stands on one pad, and a pad holds one building.
--
-- No row means "the default pad" - shared/base.ts resolves it - so a building
-- added later needs no backfill, and a fresh account writes nothing until it
-- first moves something.
--
-- Line comments only. Wrangler splits on ';' and rejects a chunk that holds
-- only a block comment.
CREATE TABLE IF NOT EXISTS base_placements (
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  building_id TEXT NOT NULL,
  pad_id      TEXT NOT NULL,
  PRIMARY KEY (player_id, building_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS base_placements_pad
  ON base_placements (player_id, pad_id);
