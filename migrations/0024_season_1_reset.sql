-- The Season 1 test reset. 2026-09-07.
--
-- Everything a player DID is wiped; everything a player IS stays: accounts,
-- callsigns, sessions, plots on the map, alliances. The base economy, the
-- levelled buildings, drones and department effects all landed in the last
-- two days on top of test data from the old game, and Season 1 starts clean
-- on them: every building level 1, no stock, no jobs, six starter assets,
-- 100,000 Tokens each.

-- What players did.
DELETE FROM squad_slots;
DELETE FROM player_assets;
DELETE FROM player_materials;
DELETE FROM marches;
DELETE FROM battle_participants;
DELETE FROM battles;
DELETE FROM base_jobs;
DELETE FROM base_levels;
DELETE FROM depot_purchases;
DELETE FROM wallet_ledger;
DELETE FROM alliance_rally;

-- The old base (Gemini-era buildings and their jobs). The tables stay for a
-- later cleanup; nothing reads a row from them any more.
DELETE FROM build_jobs;
DELETE FROM buildings;

-- Chat, clean.
DELETE FROM message_mentions;
DELETE FROM message_translations;
DELETE FROM channel_reads;
DELETE FROM messages;
DELETE FROM chat_group_members;
DELETE FROM chat_groups;
DELETE FROM dm_threads;

-- The base: no stock, clock from now.
UPDATE bases
   SET fuel = 0, steel = 0, munitions = 0, alloy = 0,
       resources_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       stock_rev = 0;

-- The wallet: 100,000 Tokens, no Credits, no Second Engineer Team. The
-- weekly top-up counter is reset so the floor applies from this week.
UPDATE players
   SET tokens = 100000, credits = 0, wallet_rev = wallet_rev + 1,
       granted_week = 0, second_team_at = NULL;
