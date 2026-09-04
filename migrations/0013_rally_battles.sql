-- Rendezvous points, and the record of battles.
--
-- Two features that do not obviously belong together, in one migration because
-- both are about the world map and both are cheap.

-- ONE rendezvous point per alliance, which is why alliance_id is the primary
-- key rather than a column. Setting a new RV replaces the old one in a single
-- upsert - there is no read-then-write, so a general and a lieutenant pressing
-- Set at the same instant produce one marker, not two.
CREATE TABLE IF NOT EXISTS alliance_rally (
  alliance_id TEXT PRIMARY KEY REFERENCES alliances(id) ON DELETE CASCADE,
  world_id    INTEGER NOT NULL,
  plot_x      INTEGER NOT NULL,
  plot_y      INTEGER NOT NULL,
  set_by      TEXT NOT NULL REFERENCES players(id),
  set_at      INTEGER NOT NULL
);

-- When this player last answered a rally. The cooldown is what stops RV being
-- a free escape from every incoming attack once combat exists; it lives on the
-- placement because rallying IS a move, and it must survive changing alliance.
ALTER TABLE placements ADD COLUMN rallied_at INTEGER NOT NULL DEFAULT 0;

-- A fought battle. Denormalised on purpose: the report list is the page people
-- open most and it has to be one query with no joins, so the headline numbers
-- are copied here even though they could be derived from `detail`.
--
-- `detail` is the full blow-by-blow as JSON, written once when the battle
-- resolves and never updated. It is deliberately opaque to SQL - the shape of
-- a combat log will change as combat is tuned, and a schema that has to change
-- with it would mean a migration every time a number moves.
CREATE TABLE IF NOT EXISTS battles (
  id                   TEXT PRIMARY KEY,
  world_id             INTEGER NOT NULL,
  plot_x               INTEGER NOT NULL,
  plot_y               INTEGER NOT NULL,
  fought_at            INTEGER NOT NULL,

  attacker_id          TEXT NOT NULL REFERENCES players(id),
  defender_id          TEXT NOT NULL REFERENCES players(id),
  attacker_name        TEXT NOT NULL,
  defender_name        TEXT NOT NULL,
  attacker_alliance    TEXT,
  defender_alliance    TEXT,

  -- 'attacker' | 'defender' | 'draw'
  outcome              TEXT NOT NULL,

  attacker_power       INTEGER NOT NULL DEFAULT 0,
  defender_power       INTEGER NOT NULL DEFAULT 0,
  attacker_losses      INTEGER NOT NULL DEFAULT 0,
  defender_losses      INTEGER NOT NULL DEFAULT 0,

  loot_fuel            INTEGER NOT NULL DEFAULT 0,
  loot_steel           INTEGER NOT NULL DEFAULT 0,
  loot_munitions       INTEGER NOT NULL DEFAULT 0,
  loot_alloy           INTEGER NOT NULL DEFAULT 0,

  detail               TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_battles_when ON battles(fought_at DESC);

-- Who was in it, and therefore who may read it. A separate table rather than
-- two columns on `battles` because reinforcement is coming: a battle will have
-- more than two people in it, and the alternative is rewriting this later
-- while there is live data in it.
CREATE TABLE IF NOT EXISTS battle_participants (
  battle_id   TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- 'attacker' | 'defender'
  side        TEXT NOT NULL,
  alliance_id TEXT,
  PRIMARY KEY (battle_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_battle_participants_player
  ON battle_participants(player_id);

-- The alliance index is what makes "my alliance's battles" one query instead
-- of a roster lookup followed by a list of player ids.
CREATE INDEX IF NOT EXISTS idx_battle_participants_alliance
  ON battle_participants(alliance_id);
