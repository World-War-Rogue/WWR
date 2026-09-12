-- Bug reports from inside the game.
--
-- Built after a tester reported a real chat delivery bug in Korean, through
-- the chat channel that was broken, and the translation turned it into "No
-- direct translation." The report failed twice independently and cost a day.
-- A form that writes a row here fails neither way: it does not depend on the
-- feature under test, and it never passes through a translator.

CREATE TABLE IF NOT EXISTS bug_reports (
  id         TEXT PRIMARY KEY,

  -- ON DELETE SET NULL, not CASCADE. A report is evidence about the game, and
  -- it stays useful after the account that filed it is gone. `callsign` is
  -- denormalised for the same reason - it is who reported it at the time, not
  -- a live pointer to whatever that account is called now.
  player_id  TEXT REFERENCES players(id) ON DELETE SET NULL,
  callsign   TEXT NOT NULL,

  created_at INTEGER NOT NULL,

  -- Exactly what they typed, in whatever language they typed it.
  --
  -- Never translated on the way in. m2m100 loses anything with a clause in it
  -- and fails fluently, so a translated report reads like a sentence and means
  -- something else - which is the specific failure this table exists to stop.
  -- Translate on the way out, for reading, with the original kept beside it.
  body       TEXT NOT NULL,
  lang       TEXT NOT NULL,

  -- Context nobody should have to be asked for. Three quarters of "cannot
  -- reproduce" is one of these fields being unknown.
  screen     TEXT,
  build      TEXT,
  world_id   INTEGER,
  viewport   TEXT,
  user_agent TEXT,
  -- Recent console errors as a JSON array, capped client-side. Often the whole
  -- answer, and free to collect.
  console    TEXT,

  -- 'new' | 'triaged' | 'fixed' | 'wontfix'
  status     TEXT NOT NULL DEFAULT 'new',
  notes      TEXT
);

-- The drain query: everything unhandled, newest first. This is the one read
-- that happens every time somebody asks what has come in.
CREATE INDEX IF NOT EXISTS idx_bug_reports_queue
  ON bug_reports(status, created_at DESC);

-- The rate limit reads one player's most recent report. Without an index this
-- is a scan of the whole table on every submission, and the table only grows.
CREATE INDEX IF NOT EXISTS idx_bug_reports_player
  ON bug_reports(player_id, created_at DESC);
