-- Alliances.
--
-- An alliance belongs to a home world. That is not a limitation, it is the
-- point: alliances are how a server becomes a place with politics in it, and an
-- alliance spanning every server would make the server number meaningless. It
-- is also what makes an event world legible - when eight servers share one map,
-- "my alliance" has to mean something narrower than "people I like".
--
-- One alliance per player, enforced by player_id being the primary key of the
-- membership table rather than by checking first. Two invitations accepted in
-- the same instant would both pass a check; only one can win the insert.

CREATE TABLE IF NOT EXISTS alliances (
  id            TEXT PRIMARY KEY,
  -- Short tag shown in brackets before a callsign, e.g. [WWR].
  tag           TEXT NOT NULL,
  tag_key       TEXT NOT NULL,
  name          TEXT NOT NULL,
  name_key      TEXT NOT NULL,
  description   TEXT,
  home_world_id INTEGER NOT NULL REFERENCES worlds(id),
  -- 1 = anyone may join immediately, 0 = applications must be accepted.
  open_join     INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL,
  created_by    TEXT NOT NULL REFERENCES players(id)
);

-- Tags and names are unique per world, not globally. Two servers may each have
-- a [WOLF]; inside one server the tag has to identify exactly one alliance,
-- because that is the whole job of a tag.
CREATE UNIQUE INDEX IF NOT EXISTS idx_alliances_tag
  ON alliances(home_world_id, tag_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alliances_name
  ON alliances(home_world_id, name_key);

CREATE TABLE IF NOT EXISTS alliance_members (
  -- The primary key IS the one-alliance-per-player rule.
  player_id    TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  alliance_id  TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  -- 'leader' | 'officer' | 'member'
  rank         TEXT NOT NULL DEFAULT 'member',
  joined_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alliance_members_alliance
  ON alliance_members(alliance_id);

CREATE TABLE IF NOT EXISTS alliance_applications (
  alliance_id TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (alliance_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_alliance_applications_player
  ON alliance_applications(player_id);
