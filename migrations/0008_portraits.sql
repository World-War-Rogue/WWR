-- Uploaded profile pictures.
--
-- In their own table rather than a column on players, because a portrait is
-- tens of kilobytes and the players row is read on every authenticated
-- request. A column would drag the image through the session lookup, the world
-- payload and the access-request list, none of which want it. Here it is
-- loaded only when a profile is actually being looked at.
--
-- Stored as a data URL. That is not the shape this takes once there is object
-- storage in front of it - it would be a key - but there is no bucket yet, and
-- a data URL means the profile endpoint hands the client something it can
-- render with no second request and no signed URL to expire.

CREATE TABLE IF NOT EXISTS player_portraits (
  player_id  TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  -- 'image/webp' or 'image/jpeg'. Checked against the bytes, not trusted.
  mime       TEXT NOT NULL,
  data_url   TEXT NOT NULL,
  bytes      INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
