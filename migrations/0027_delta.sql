-- Task Force Delta: bought at Command Center 10, or free at Command Center 20
-- once Alpha, Bravo and Charlie are full and every asset in them is Service
-- Rank 20 or better. The instant it was opened, either way; NULL = not yet.
ALTER TABLE players ADD COLUMN delta_at INTEGER;
