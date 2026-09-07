-- Combat Systems: three upgrade lanes per Task Force (shared/combatSystems.ts).
-- One row per (player, Task Force), created on first purchase. A Task Force
-- with no row is at level 1 in every lane. Levels are held to 1..50 here as
-- well as in code, so a second code path cannot push one past the ceiling.
-- No semicolons in these comments: wrangler splits the file on them.
CREATE TABLE squad_systems (
  player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  squad         TEXT NOT NULL,
  fire_control  INTEGER NOT NULL DEFAULT 1 CHECK (fire_control BETWEEN 1 AND 50),
  survivability INTEGER NOT NULL DEFAULT 1 CHECK (survivability BETWEEN 1 AND 50),
  sustainment   INTEGER NOT NULL DEFAULT 1 CHECK (sustainment BETWEEN 1 AND 50),
  PRIMARY KEY (player_id, squad)
);
