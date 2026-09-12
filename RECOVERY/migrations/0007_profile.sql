-- Player profiles.
--
-- The card another player sees when they click your base: who you are, how
-- strong you are, where you came from, and eventually which alliance you
-- answer to.
--
-- Power is deliberately NOT a column. It is computed from building levels on
-- every read, for the same reason resources are settled on read rather than
-- ticked: a stored number is a number that can drift, and a power figure that
-- disagrees with the base it describes is worse than no figure at all.
--
-- Alliance is not here either. It arrives with the alliance tables; until then
-- the profile reports no alliance rather than pretending to a column that
-- would only ever hold null.

-- The portrait is chosen, not uploaded. A glyph and a tint, drawn by the same
-- code that draws emblems on banners, which means no image storage, nothing to
-- moderate, and a portrait that is sharp at any size. Uploads can replace this
-- later without the profile changing shape - see the note in Profile.tsx.
ALTER TABLE players ADD COLUMN portrait_glyph TEXT NOT NULL DEFAULT 'star';
ALTER TABLE players ADD COLUMN portrait_tint  TEXT NOT NULL DEFAULT 'ember';

-- One line the player writes about themselves. Shown on the card.
ALTER TABLE players ADD COLUMN motto TEXT;
