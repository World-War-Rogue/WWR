-- Worlds, placements and movement.
--
-- A world is one map. Every player has a home world holding at most 1000
-- bases. Battle events open a temporary world that several home worlds are
-- admitted to; players enter it by choosing an open plot and moving there, and
-- it closes when the event ends.
--
-- Position is therefore not a property of a base - a player can hold ground in
-- their home world and in an event world at the same time. It lives in its own
-- table keyed by world, which is what makes events possible without touching
-- anything else.
--
-- A plot is a 4x4 block of world tiles. Plots are addressed in plot units, so
-- two bases can never half-overlap and the unique index below is the only
-- collision check movement needs.

CREATE TABLE IF NOT EXISTS worlds (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  kind      TEXT NOT NULL DEFAULT 'home',   -- 'home' | 'event'
  capacity  INTEGER NOT NULL DEFAULT 1000,
  extent    INTEGER NOT NULL DEFAULT 200,   -- half-width in plots
  opened_at INTEGER NOT NULL,
  closes_at INTEGER                         -- event worlds only
);

-- Which home worlds may enter a given event world. An event with eight rows
-- here is the "eight servers fighting" case the world is sized for.
CREATE TABLE IF NOT EXISTS world_admissions (
  event_world_id INTEGER NOT NULL REFERENCES worlds(id),
  home_world_id  INTEGER NOT NULL REFERENCES worlds(id),
  PRIMARY KEY (event_world_id, home_world_id)
);

CREATE TABLE IF NOT EXISTS placements (
  world_id  INTEGER NOT NULL REFERENCES worlds(id),
  player_id TEXT    NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  plot_x    INTEGER NOT NULL,
  plot_y    INTEGER NOT NULL,
  placed_at INTEGER NOT NULL,
  PRIMARY KEY (world_id, player_id)
);

-- One base per plot per world. This constraint, not a read-then-write check,
-- is what makes two players pressing Move on the same square at the same
-- moment safe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_placements_plot
  ON placements(world_id, plot_x, plot_y);

CREATE INDEX IF NOT EXISTS idx_placements_player ON placements(player_id);

ALTER TABLE bases ADD COLUMN home_world_id INTEGER REFERENCES worlds(id);
ALTER TABLE bases ADD COLUMN skin TEXT NOT NULL DEFAULT 'desert_fob';

-- Numbering starts high so a world reads as established rather than as a beta
-- with eleven players in it.
INSERT OR IGNORE INTO worlds (id, name, kind, capacity, extent, opened_at)
VALUES (1001, 'Sandstorm Perimeter', 'home', 1000, 200, unixepoch() * 1000);
