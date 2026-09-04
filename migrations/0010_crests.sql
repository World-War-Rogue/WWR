-- Alliance crests.
--
-- Same shape as player portraits, and for the same reasons: its own table
-- because the image is tens of kilobytes and the alliance row is read on every
-- roster load, and a data URL because there is no object storage yet.
--
-- The fallback is not a glyph. An alliance already has a tag, and the tag is
-- the thing other players read it by, so an alliance with no uploaded crest
-- shows its own tag on a colour it chose. That is a crest rather than a
-- placeholder, which means an alliance never looks unfinished.

CREATE TABLE IF NOT EXISTS alliance_portraits (
  alliance_id TEXT PRIMARY KEY REFERENCES alliances(id) ON DELETE CASCADE,
  mime        TEXT NOT NULL,
  data_url    TEXT NOT NULL,
  bytes       INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

ALTER TABLE alliances ADD COLUMN emblem_tint TEXT NOT NULL DEFAULT 'ember';
