-- Daily map exercises (shared/exercises.ts, worker/exercises.ts).
--
-- Three personal Dominion targets per player per RST day, on empty plots
-- near their base, visible only to them. state: available -> marching ->
-- settled | failed. A battle target stores the patrol generated at spawn
-- (snapshot_power is the Task Force power it was sized from) and it never
-- changes afterwards. march_id links the march that took it.
-- marches.exercise_id: the target a march of kind 'exercise' is going to.
-- No semicolons in these comments: wrangler splits the file on them.
CREATE TABLE map_exercises (
  id             TEXT PRIMARY KEY,
  player_id      TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  world_id       INTEGER NOT NULL,
  day_key        TEXT NOT NULL,
  type           TEXT NOT NULL,
  plot_x         INTEGER NOT NULL,
  plot_y         INTEGER NOT NULL,
  state          TEXT NOT NULL DEFAULT 'available',
  snapshot_power INTEGER NOT NULL DEFAULT 0,
  patrol         TEXT,
  march_id       TEXT,
  squad          TEXT,
  hold_until     INTEGER,
  settled_at     INTEGER,
  created_at     INTEGER NOT NULL
);

CREATE INDEX map_exercises_day ON map_exercises (player_id, day_key);

ALTER TABLE marches ADD COLUMN exercise_id TEXT;
