-- Layered base customisation.
--
-- A base is a skin plus four accessory layers: a banner, an emblem, a
-- perimeter light colour and a ground marking. The catalogue itself lives in
-- shared/cosmetics.ts, not here, for the same reason the building specs do:
-- adding an item is a deploy, not a data migration, and the server and client
-- cannot end up holding different ideas of what exists.
--
-- So this migration stores only the two things the database actually has to
-- remember - who owns what, and what each base is currently wearing.

-- Ownership of PAID items only.
--
-- Free items are not rows. Every player owns them by virtue of the catalogue
-- saying price = 0, which means adding a new free item needs no backfill
-- across every account and this table stays proportional to what people have
-- actually bought rather than to the size of the catalogue times the
-- population.
CREATE TABLE IF NOT EXISTS player_cosmetics (
  player_id   TEXT    NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id     TEXT    NOT NULL,
  slot        TEXT    NOT NULL,
  -- 'purchase' | 'grant' | 'reward'. Kept so a refund or a mistaken grant can
  -- be found later without guessing from timestamps.
  source      TEXT    NOT NULL DEFAULT 'grant',
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_player_cosmetics_player ON player_cosmetics(player_id);

-- What each base is wearing. Four short ids rather than a join table: exactly
-- one item can occupy a slot, and the map viewport reads these columns for
-- every base in view, so they belong on the row being read.
ALTER TABLE bases ADD COLUMN banner TEXT NOT NULL DEFAULT 'banner_none';
ALTER TABLE bases ADD COLUMN emblem TEXT NOT NULL DEFAULT 'emblem_none';
ALTER TABLE bases ADD COLUMN lights TEXT NOT NULL DEFAULT 'lights_amber';
ALTER TABLE bases ADD COLUMN decal  TEXT NOT NULL DEFAULT 'decal_none';
