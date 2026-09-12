-- World War Rogue - initial schema.
--
-- Design rule for this file and everything built on it: the server is the only
-- authority. Timers are stored as absolute completion instants, never as
-- remaining durations, so a client cannot shorten one by lying about the clock
-- and a restart cannot lose progress. Times are unix epoch milliseconds.

CREATE TABLE IF NOT EXISTS players (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL,
  username_key  TEXT NOT NULL UNIQUE,   -- lowercased, for case-insensitive uniqueness
  password_hash TEXT NOT NULL,          -- PBKDF2-SHA256, salt and iterations encoded inline
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_player  ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- One base per player for now. Resources are stored alongside the instant they
-- were last settled; production between then and now is derived on read rather
-- than written by a background job.
CREATE TABLE IF NOT EXISTS bases (
  player_id       TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  fuel            INTEGER NOT NULL DEFAULT 2000,
  steel           INTEGER NOT NULL DEFAULT 2000,
  munitions       INTEGER NOT NULL DEFAULT 1000,
  alloy           INTEGER NOT NULL DEFAULT 0,
  resources_at    INTEGER NOT NULL,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS buildings (
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  level      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, kind)
);

-- An upgrade in flight. completes_at is the contract: everything about progress
-- is derived from it. A partial unique index keeps one active job per base
-- without needing a lock.
CREATE TABLE IF NOT EXISTS build_jobs (
  id            TEXT PRIMARY KEY,
  player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  to_level      INTEGER NOT NULL,
  started_at    INTEGER NOT NULL,
  completes_at  INTEGER NOT NULL,
  collected_at  INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_build_jobs_active
  ON build_jobs(player_id) WHERE collected_at IS NULL;
