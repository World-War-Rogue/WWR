-- Access requests.
--
-- The game is closed. Registering creates a request rather than an account;
-- an account exists only once it has been approved.
--
-- Age is a declaration, not a stored fact. The applicant confirms they are 18
-- or over and only that confirmation is recorded - no date of birth is ever
-- collected, so there is none to leak, none to delete on request, and none to
-- hand over. It establishes that the question was asked and answered, which is
-- what a self-declared gate can honestly claim.

CREATE TABLE IF NOT EXISTS signups (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  email_key     TEXT NOT NULL,          -- lowercased, for duplicate detection
  username      TEXT NOT NULL,
  username_key  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  age_confirmed INTEGER NOT NULL,       -- the applicant's 18+ declaration
  country       TEXT NOT NULL,          -- ISO 3166-1 alpha-2
  locale        TEXT NOT NULL,
  skin          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | declined
  decide_token  TEXT NOT NULL UNIQUE,   -- secret in the approval email
  created_at    INTEGER NOT NULL,
  decided_at    INTEGER,
  request_ip    TEXT
);

CREATE INDEX IF NOT EXISTS idx_signups_status ON signups(status, created_at);
CREATE INDEX IF NOT EXISTS idx_signups_email  ON signups(email_key);

-- Profile fields on the account itself. Country and locale are changeable
-- in-game; email identifies the account.
ALTER TABLE players ADD COLUMN email TEXT;
ALTER TABLE players ADD COLUMN email_key TEXT;
ALTER TABLE players ADD COLUMN country TEXT NOT NULL DEFAULT 'US';
ALTER TABLE players ADD COLUMN locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE players ADD COLUMN approved_at INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_email ON players(email_key);
