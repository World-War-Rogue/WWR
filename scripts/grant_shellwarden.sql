-- Give Shellwarden to GrandpaWhale.
--
--   npx wrangler d1 execute wwr-db --remote --file=./scripts/grant_shellwarden.sql
--
-- Safe to run now and safe to run again: ON CONFLICT DO NOTHING means a second
-- run changes nothing, and the SELECT at the end shows what he actually holds.
--
-- Worth running even though ALL_SKINS_UNLOCKED is currently true and everyone
-- can wear everything. That flag is a switch in FRONT of the ownership check,
-- not a replacement for it, so the day it is turned off ownership is what
-- decides - and a player who has been wearing a skin for weeks losing it in a
-- deploy is the kind of thing nobody connects to a one-line config change.
--
-- Not exclusive. Shellwarden is a premium skin, not a one-of-one; signature_one
-- is the only thing that flag belongs on.

INSERT INTO player_cosmetics (player_id, item_id, slot, source, acquired_at, exclusive)
SELECT p.id, 'shellwarden', 'skin', 'gift', unixepoch() * 1000, 0
  FROM players p
 WHERE p.username = 'GrandpaWhale'
    ON CONFLICT(player_id, item_id) DO NOTHING;

-- Nothing above fails loudly if the username is wrong - it just inserts zero
-- rows - so this is how you find out whether it worked.
SELECT p.username, c.item_id, c.slot, c.source, c.exclusive
  FROM player_cosmetics c JOIN players p ON p.id = c.player_id
 WHERE c.item_id = 'shellwarden';
