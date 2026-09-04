-- One-of-one items.
--
-- A commissioned skin sold to a single player is worth what it is worth
-- because nobody else can ever have it. That promise cannot rest on remembering
-- not to sell it twice - a support agent, a refund flow, a second admin, or a
-- retry on a failed grant would all break it quietly, months later, and the
-- player who paid would be the one to discover it.
--
-- So it is enforced here. A grant of an exclusive item that is already held by
-- somebody is rejected by the index, in the same way two players cannot stand
-- on the same plot.

ALTER TABLE player_cosmetics ADD COLUMN exclusive INTEGER NOT NULL DEFAULT 0;

-- Partial index: ordinary items may be owned by everyone, exclusive ones by
-- exactly one account, forever.
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_cosmetics_exclusive
  ON player_cosmetics(item_id) WHERE exclusive = 1;
