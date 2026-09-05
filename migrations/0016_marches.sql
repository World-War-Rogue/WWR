-- Squads on the move.
--
-- A march is the whole of an attack: who left, from where, at whom, and when
-- they arrive. The battle itself is settled on read like everything else in
-- this game - nothing ticks in the background, so a world nobody is looking at
-- costs nothing and a march that lands at 3am lands correctly anyway.

CREATE TABLE IF NOT EXISTS marches (
  id           TEXT PRIMARY KEY,
  world_id     INTEGER NOT NULL,

  attacker_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- 'Alpha' | 'Bravo' | 'Charlie' | 'Delta'. The squad is AWAY while this row
  -- is unresolved, which is what makes attacking a real decision.
  squad        TEXT NOT NULL,
  defender_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  from_x       INTEGER NOT NULL,
  from_y       INTEGER NOT NULL,
  to_x         INTEGER NOT NULL,
  to_y         INTEGER NOT NULL,

  -- The squad AS IT LEFT, frozen at launch.
  --
  -- Not read from squad_slots on arrival: the squad can be rearranged while it
  -- is in the air, so reading it late would let somebody send an empty squad
  -- and swap the roster in before it lands. What marched is what fights.
  units        TEXT NOT NULL DEFAULT '[]',

  departed_at  INTEGER NOT NULL,
  -- An absolute instant, never a remaining duration. A client cannot shorten
  -- one by lying about its clock, and nothing is lost on restart.
  arrives_at   INTEGER NOT NULL,

  -- Null while in transit. Set when the battle has been fought.
  resolved_at  INTEGER,
  battle_id    TEXT
);

-- One squad can only be marching once. Enforced by the database rather than a
-- check, because two taps in the same instant would both read it as home.
CREATE UNIQUE INDEX IF NOT EXISTS idx_marches_one_per_squad
  ON marches(attacker_id, squad) WHERE resolved_at IS NULL;

-- What the map draws, and what gets settled on read.
CREATE INDEX IF NOT EXISTS idx_marches_pending
  ON marches(world_id, resolved_at, arrives_at);

-- Warning the defender: everything inbound at me that has not landed.
CREATE INDEX IF NOT EXISTS idx_marches_incoming
  ON marches(defender_id, resolved_at);
