-- Five new starter skins, and the six they replace.
--
-- Desert FOB, Arctic Station, Jungle Outpost, Urban Garrison, Custom I and
-- Custom II are gone from the catalogue. Anything still wearing one would
-- render as a base with no skin, because the client looks its id up in
-- SKIN_IDENTITY and finds nothing - so every reference has to move here, in
-- the same deploy that removes them.
--
-- Ember Sentinel, Ravenkeep, Shellwarden and Shadow Empress are untouched.
-- They are not starters and are not offered to anyone; Shellwarden in
-- particular is already granted and that grant must survive this.

-- Bases wearing a removed skin. Spread across the five new starters rather
-- than all landing on one, so a world that was four different-looking bases
-- does not become forty identical ones overnight. The modulo is over rowid,
-- which is arbitrary but stable and needs no random().
UPDATE bases
   SET skin = CASE (rowid % 5)
                WHEN 0 THEN 'circular_shield_bunker'
                WHEN 1 THEN 'desert_command_citadel'
                WHEN 2 THEN 'field_workshop'
                WHEN 3 THEN 'medieval_fortress'
                ELSE        'rose_command_citadel'
              END
 WHERE skin IN ('desert_fob', 'arctic_station', 'jungle_outpost',
                'urban_garrison', 'custom_one', 'custom_two');

-- Ownership rows for skins that no longer exist. These were free starters, so
-- nothing bought is being taken away - and a row pointing at a missing id
-- would show up in Customise as an item that cannot be equipped.
--
-- The slot filter matters: item ids live in one namespace with banners,
-- emblems, lights and decals, and deleting by id alone would be one collision
-- away from removing somebody's accessory.
DELETE FROM player_cosmetics
 WHERE slot = 'skin'
   AND item_id IN ('desert_fob', 'arctic_station', 'jungle_outpost',
                   'urban_garrison', 'custom_one', 'custom_two');

-- The column default from 0002 still names desert_fob. SQLite cannot alter a
-- default without rebuilding the table, and every insert in the Worker names
-- the skin explicitly, so it is dead text rather than a live fallback. Left
-- alone deliberately: rebuilding bases to change a string nothing reads would
-- risk far more than it fixes.
