-- ONBOARDING, SHIELDS & CONSTRUCTION v1.

-- Weekly blueprints are built, one at a time per player, at the category's
-- asset building. Absolute timer; folded into player_assets on the first read
-- past completes_at.
CREATE TABLE IF NOT EXISTS asset_builds (
  id           TEXT PRIMARY KEY,
  player_id    TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  asset_id     TEXT NOT NULL,
  started_at   INTEGER NOT NULL,
  completes_at INTEGER NOT NULL,
  applied_at   INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_builds_one_running
  ON asset_builds(player_id) WHERE applied_at IS NULL;

-- Shields. One at a time; a cooldown after; two free coupons a week, granted
-- lazily when the week turns (coupon_week is the game week they belong to).
ALTER TABLE players ADD COLUMN shield_until INTEGER;
ALTER TABLE players ADD COLUMN shield_kind TEXT;
ALTER TABLE players ADD COLUMN shield_cooldown_until INTEGER;
ALTER TABLE players ADD COLUMN coupon_week INTEGER NOT NULL DEFAULT -1;
ALTER TABLE players ADD COLUMN coupon_8_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN coupon_4_used INTEGER NOT NULL DEFAULT 0;

-- Admiral Rider: where each player is in the walkthrough, whether he is on,
-- and which one-time tips have been shown (JSON list).
ALTER TABLE players ADD COLUMN guide_step INTEGER NOT NULL DEFAULT 1;
ALTER TABLE players ADD COLUMN guide_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE players ADD COLUMN guide_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN guide_tips TEXT NOT NULL DEFAULT '[]';

-- Season 1 opens with everyone under the New Commander Shield for 48 hours,
-- the same as a fresh account.
UPDATE players
   SET shield_until = CAST(strftime('%s', 'now') AS INTEGER) * 1000 + 48 * 3600 * 1000,
       shield_kind = 'new';
