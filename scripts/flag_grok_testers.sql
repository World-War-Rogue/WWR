-- Mark Grok's tester accounts as test bots.
--
-- role = 'testbot' makes the server refuse their attacks wherever
-- TEST_BOTS_MAY_ATTACK is not "on" (the live server), and lists them on
-- /api/admin/bots with a Sign in as link. Add callsigns to the list as
-- Grok creates them, then run:
--
--   npx wrangler d1 execute wwr-db --remote --env="" --file scripts/flag_grok_testers.sql
--
-- Safe to run more than once. No semicolons in comments - wrangler splits on them.
UPDATE players SET role = 'testbot'
 WHERE role = 'player'
   AND username_key IN ('rookiefox', 'trenchrat', 'blitzhawk', 'supplysarge', 'ghostops');

INSERT INTO bots (player_id, kind, seed, ceiling, planted_at, grown_at)
SELECT id, 'test', 0, 0, created_at, created_at
  FROM players
 WHERE role = 'testbot'
   AND id NOT IN (SELECT player_id FROM bots);
