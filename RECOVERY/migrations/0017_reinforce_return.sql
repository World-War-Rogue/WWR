-- Reinforcement, and the journey home.
--
-- A march used to be one-way and always hostile. Both are now false: you
-- cannot attack your own alliance, you reinforce them instead, and every squad
-- has to travel back before it is home.

-- 'attack' | 'reinforce' | 'return'
--
-- A return leg is a march like any other, which is the point: it is drawn on
-- the map, it takes the same time, everybody watches it, and the squad is away
-- for the whole round trip rather than only the journey out.
ALTER TABLE marches ADD COLUMN kind TEXT NOT NULL DEFAULT 'attack';

-- Where a reinforcing squad is standing once it arrives, and how long it
-- stays. Null on attacks and returns.
ALTER TABLE marches ADD COLUMN garrison_until INTEGER;

-- One reinforcement per teammate, decided by the database rather than a check.
-- Without it a player stacks all four squads on whoever is being hit and the
-- alliance stops being a network of people who each hold their own ground.
--
-- It has to cover the squad standing there as well as the one still in the
-- air. Counting only the flight would let a player land one squad, have it
-- garrison, and immediately send a second to the same teammate - four squads
-- on one plot again, one landing at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_marches_one_reinforcement
  ON marches(attacker_id, defender_id)
  WHERE kind = 'reinforce' AND (resolved_at IS NULL OR garrison_until IS NOT NULL);

-- Reinforcements standing at somebody's base, for the defence roll-up.
CREATE INDEX IF NOT EXISTS idx_marches_garrison
  ON marches(defender_id, kind, garrison_until);

-- A squad is busy while it is in the air OR while it is standing at an ally's
-- base. The index from 0016 only knew the first, which would have let one
-- squad hold two plots at once: reinforce a teammate, land, and march again
-- while the first roster still counted for their defence.
--
-- This works only because garrison_until is cleared the instant a garrison
-- ends and the squad is given a return leg. A column left set would keep a
-- squad busy forever after its first reinforcement.
DROP INDEX IF EXISTS idx_marches_one_per_squad;
CREATE UNIQUE INDEX IF NOT EXISTS idx_marches_squad_busy
  ON marches(attacker_id, squad)
  WHERE resolved_at IS NULL OR garrison_until IS NOT NULL;

-- Finding garrisons that have run out, on every read of the world.
CREATE INDEX IF NOT EXISTS idx_marches_garrison_expiry
  ON marches(world_id, kind, garrison_until);
