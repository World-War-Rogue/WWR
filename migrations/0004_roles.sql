-- Account roles.
--
-- Replaces the shared admin key that guarded the approvals page. A key in a
-- query string ends up in browser history and in any log along the way, has to
-- be remembered and rotated by hand, and grants whoever holds it the ability
-- to create accounts. A role on an account is checked against the session the
-- owner already has.

ALTER TABLE players ADD COLUMN role TEXT NOT NULL DEFAULT 'player';

CREATE INDEX IF NOT EXISTS idx_players_role ON players(role) WHERE role != 'player';
