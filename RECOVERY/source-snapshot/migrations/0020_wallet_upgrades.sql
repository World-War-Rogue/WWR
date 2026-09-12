-- Wallets, the upgrade path, and the terrain seed the code already assumes.
--
-- Three things arrive together because they are one story: an asset can be
-- ranked up, ranking up costs currency, and until now neither existed. Every
-- asset in the game is Service Rank 1 because `player_assets.level` is written
-- once at signup and never updated anywhere in the codebase.
--
-- Design rules carried forward from 0001: the server is the only authority, and
-- anything that must not race is decided by the DATABASE - a constraint or a
-- conditional update - and never by a check followed by a write.
--
-- Line comments only, throughout - no C-style block comments anywhere in this
-- file, not even inside a comment. Wrangler splits a migration on ';' and
-- refuses any chunk that holds no statement, so a block-comment banner sitting
-- between two statements fails the WHOLE file with "SQL code did not contain a
-- statement [code: 7500]". That is what the first two attempts at this file did,
-- and no other migration in this directory uses them.

-- --------------------------------------------------------------------------
-- Wallets
-- --------------------------------------------------------------------------

-- Command Credits are earned; Tokens are bought. Both spend on the same things
-- and the player chooses the split. Balances live on the player rather than in
-- a wallet table because there is exactly one of each per player, forever, and
-- a join for a number that is always there is a join for nothing.
ALTER TABLE players ADD COLUMN tokens  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN credits INTEGER NOT NULL DEFAULT 0;

-- The last game week this player's weekly Token top-up was applied.
--
-- A week INDEX, not an instant. Comparing indexes means the grant cannot fire
-- twice however many times a player reloads, and cannot be missed by somebody
-- who happens to log in at 00:00:00.4 on the Monday. Zero means never granted,
-- and since week 0 was in January 1970 the first read always tops up.
ALTER TABLE players ADD COLUMN granted_week INTEGER NOT NULL DEFAULT 0;

-- Bumped on every wallet write. This is what makes a purchase atomic across two
-- tables without any exotic SQL.
--
-- A spend is two statements - take the money, apply the upgrade - and the whole
-- problem is making the second happen if and only if the first did. Guarding on
-- the balance alone does not do it: two tabs pressing the same button both read
-- the same balance, both pass `tokens >= cost`, and the player is charged twice
-- for one rank. A monotonic counter has no such ambiguity. The spend claims a
-- specific revision, and the upgrade is applied only if that exact claim landed.
--
-- Same reasoning as the unique index on squad_slots: the database decides, not a
-- check followed by a write.
ALTER TABLE players ADD COLUMN wallet_rev INTEGER NOT NULL DEFAULT 0;

-- Every movement of currency, append-only.
--
-- Balances answer "how much"; this answers "why", which is the question asked
-- the day a player says they were charged twice. Nothing here is ever updated
-- or deleted, so it can be trusted as a record rather than as a cache.
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- 'grant' | 'rank' | 'package' | 'reset'
  kind       TEXT NOT NULL,
  -- Signed. Positive is into the player's wallet, negative is out of it.
  tokens     INTEGER NOT NULL DEFAULT 0,
  credits    INTEGER NOT NULL DEFAULT 0,
  -- What it was for. An asset id for an upgrade, null for a grant.
  subject    TEXT,
  detail     TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_player ON wallet_ledger(player_id, created_at);

-- --------------------------------------------------------------------------
-- Packages
-- --------------------------------------------------------------------------

-- player_assets is rebuilt rather than ALTERed, because the constraint that
-- matters is a TABLE-level one across two columns:
--
--     a package may never outrank the asset it is bolted to
--
-- SQLite cannot add that with ADD COLUMN, and the rule is the whole reason
-- Service Rank is worth buying - take the ceiling off and Rank buys nothing the
-- packages do not, and the cheapest optimal build becomes "ignore Rank, max
-- Armament". It is enforced here, in the database, and not in a handler that
-- somebody will one day forget to route through.
--
-- Four columns rather than a packages table because the set is fixed and
-- closed. There will never be a fifth.
CREATE TABLE player_assets_new (
  player_id       TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  asset_id        TEXT NOT NULL,
  -- Displays as Service Rank. The column keeps its name: renaming a live column
  -- buys nothing and costs a migration, and the vocabulary lives in the string
  -- table. Permanent - Rank is the one thing that cannot be reset.
  level           INTEGER NOT NULL DEFAULT 1,
  pkg_armament    INTEGER NOT NULL DEFAULT 1,
  pkg_protection  INTEGER NOT NULL DEFAULT 1,
  pkg_propulsion  INTEGER NOT NULL DEFAULT 1,
  pkg_electronics INTEGER NOT NULL DEFAULT 1,
  -- Command Credits sunk into the four packages on this asset. Refunded in full
  -- on a reset; Tokens are not refunded, so they are deliberately not counted
  -- here. Kept on the row rather than summed from the ledger because a refund
  -- must not depend on a scan that a future ledger change could quietly alter.
  pkg_credits     INTEGER NOT NULL DEFAULT 0,
  acquired_at     INTEGER NOT NULL,
  PRIMARY KEY (player_id, asset_id),
  CHECK (level >= 1),
  CHECK (pkg_armament    BETWEEN 1 AND level),
  CHECK (pkg_protection  BETWEEN 1 AND level),
  CHECK (pkg_propulsion  BETWEEN 1 AND level),
  CHECK (pkg_electronics BETWEEN 1 AND level),
  CHECK (pkg_credits >= 0)
);

INSERT INTO player_assets_new (player_id, asset_id, level, acquired_at)
  SELECT player_id, asset_id, level, acquired_at FROM player_assets;

DROP TABLE player_assets;
ALTER TABLE player_assets_new RENAME TO player_assets;

-- Materials, for the package tiers that will want them.
--
-- Its own table rather than more columns: four arrive here - Munitions Kits,
-- Armour Plates, Drive Assemblies, Signal Components - and Technical Dossier
-- Pages and Engineer Kits are already known to be coming.
--
-- Nothing spends these yet, and nothing produces them yet. The table exists so
-- that the day a battle starts dropping them is a handler change and not a
-- migration on a live season.
CREATE TABLE IF NOT EXISTS player_materials (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  material  TEXT NOT NULL,
  amount    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, material),
  CHECK (amount >= 0)
);

-- --------------------------------------------------------------------------
-- Terrain seeds
-- --------------------------------------------------------------------------

-- shared/terrain.ts has documented these since the terrain rewrite and they
-- were never actually added, which made the comment a lie and left every world
-- deriving its seed from its id forever.
--
-- Stored per world so a world's layout can be re-rolled without changing its
-- identity, and so an improvement to the generator gives NEW worlds better
-- terrain while leaving existing ones exactly as they are. A rock shelf must
-- never move under somebody's base because a generator was improved on a
-- Tuesday.
--
-- Null means "derive it the old way", which is what every existing world does,
-- so nothing already on a map moves.
ALTER TABLE worlds ADD COLUMN terrain_seed    INTEGER;
ALTER TABLE worlds ADD COLUMN terrain_version INTEGER NOT NULL DEFAULT 1;
