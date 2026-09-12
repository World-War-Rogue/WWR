-- Grants owner rights to one account.
--
-- Owner rights are deliberately not grantable from inside the game: the only
-- way to create one is here, with database access, so a compromised account
-- cannot promote itself.
--
-- If the SELECT at the end returns no rows, the account does not exist yet -
-- an access request that has not been approved is not an account.

UPDATE players SET role = 'owner' WHERE username_key = lower('MattofWar');

SELECT username, role, email FROM players WHERE role = 'owner';
