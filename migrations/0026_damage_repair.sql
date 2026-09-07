-- Damage and repair. GAME-MATH v1 §5.
--
-- An asset comes home with what it had left. hp_fraction is 0-1 (0 = disabled,
-- repairable, never deleted). A repair is an absolute instant; the first read
-- past it restores the asset to 1.
ALTER TABLE player_assets ADD COLUMN hp_fraction REAL NOT NULL DEFAULT 1;
ALTER TABLE player_assets ADD COLUMN repair_ends_at INTEGER;
