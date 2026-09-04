-- Grant a cosmetic or a premium base skin to one player.
--
-- Edit the three values below, then:
--   npx wrangler d1 execute wwr-db --remote --file=./scripts/grant_cosmetic.sql
--
-- item_id is either a cosmetic id from shared/cosmetics.ts (banner_chevron,
-- lights_azure, ...) or a skin id from worker/game.ts (custom_one, custom_two,
-- signature_one).
--
-- Set exclusive to 1 ONLY for a one-of-one commission. The unique index will
-- refuse a second grant of the same exclusive item, which is the point: that
-- refusal is the promise being kept.

INSERT INTO player_cosmetics (player_id, item_id, slot, source, acquired_at, exclusive)
SELECT p.id, 'signature_one', 'skin', 'purchase', unixepoch() * 1000, 1
  FROM players p
 WHERE p.username = 'MattofWar'
    ON CONFLICT(player_id, item_id) DO NOTHING;

SELECT p.username, c.item_id, c.slot, c.source, c.exclusive
  FROM player_cosmetics c JOIN players p ON p.id = c.player_id
 ORDER BY c.acquired_at DESC;
