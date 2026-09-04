-- Removes accounts created while testing the API.
--
-- Deletes are explicit per table rather than relying on ON DELETE CASCADE,
-- because whether cascades fire depends on foreign keys being enabled for the
-- connection - and a half-deleted player leaves a base standing on the map
-- with nobody behind it. Players are deleted last so the earlier subqueries
-- can still find them.
--
-- D1 does not permit temporary tables, so the match is repeated inline. It
-- only matches the generated test prefixes: real callsigns are 6-20 letters
-- with no digits or dashes, so none of these patterns can hit a real player.

DELETE FROM placements WHERE player_id IN (
  SELECT id FROM players WHERE username_key LIKE 'apitest-%'
     OR username_key LIKE 'worldtest-%' OR username_key LIKE 'ringtest-%'
     OR username_key LIKE 'probe-%');

DELETE FROM build_jobs WHERE player_id IN (
  SELECT id FROM players WHERE username_key LIKE 'apitest-%'
     OR username_key LIKE 'worldtest-%' OR username_key LIKE 'ringtest-%'
     OR username_key LIKE 'probe-%');

DELETE FROM buildings WHERE player_id IN (
  SELECT id FROM players WHERE username_key LIKE 'apitest-%'
     OR username_key LIKE 'worldtest-%' OR username_key LIKE 'ringtest-%'
     OR username_key LIKE 'probe-%');

DELETE FROM sessions WHERE player_id IN (
  SELECT id FROM players WHERE username_key LIKE 'apitest-%'
     OR username_key LIKE 'worldtest-%' OR username_key LIKE 'ringtest-%'
     OR username_key LIKE 'probe-%');

DELETE FROM bases WHERE player_id IN (
  SELECT id FROM players WHERE username_key LIKE 'apitest-%'
     OR username_key LIKE 'worldtest-%' OR username_key LIKE 'ringtest-%'
     OR username_key LIKE 'probe-%');

DELETE FROM players WHERE username_key LIKE 'apitest-%'
   OR username_key LIKE 'worldtest-%' OR username_key LIKE 'ringtest-%'
   OR username_key LIKE 'probe-%';

DELETE FROM signups WHERE username_key LIKE 'apitest-%'
   OR username_key LIKE 'worldtest-%' OR username_key LIKE 'ringtest-%'
   OR username_key LIKE 'probe-%';

SELECT COUNT(*) AS players_remaining FROM players;
