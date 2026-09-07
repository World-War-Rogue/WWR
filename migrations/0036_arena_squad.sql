-- The Arena Squad: one saved loadout per player for the Arena, six slots,
-- separate from the world Task Forces (squad_slots). An asset may be in
-- both: this table borrows nothing. Rules in shared/arenaSquad.ts.
CREATE TABLE arena_squad_slots (
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  slot       INTEGER NOT NULL,
  asset_id   TEXT NOT NULL,
  PRIMARY KEY (player_id, slot)
);
-- One asset sits in one Arena slot.
CREATE UNIQUE INDEX arena_squad_asset ON arena_squad_slots (player_id, asset_id);
