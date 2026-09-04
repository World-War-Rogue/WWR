-- Chat.
--
-- One table for every kind of conversation, keyed by a channel string:
--
--   server:1001          everyone whose home world is 1001
--   alliance:<id>        every member of that alliance
--   leadership:<id>      the general and the lieutenants of that alliance
--   dm:<idA>|<idB>       two players, ids sorted so both sides compute the
--                        same key and there is only ever one conversation
--
-- Four tables would mean four sets of the same query, four indexes and four
-- places to fix a bug in how messages are paged. The thing that actually
-- differs between channels is who may read and write them, and that is a
-- question about the player rather than about the message - so it lives in the
-- Worker, not in the schema.
--
-- Nothing here grants access. A channel string in a request is a claim; the
-- server decides whether the player standing behind it belongs there.

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  channel    TEXT NOT NULL,
  author_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Every read is "this channel, since this instant, in order". This index is
-- that query.
CREATE INDEX IF NOT EXISTS idx_messages_channel
  ON messages(channel, created_at);

-- How far each player has read in each channel, so an unread count is a
-- comparison rather than a scan of everything they have ever seen.
CREATE TABLE IF NOT EXISTS channel_reads (
  player_id    TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL,
  last_read_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, channel)
);

-- Which private conversations a player has, so the Private tab can list them
-- without scanning every message ever sent.
CREATE TABLE IF NOT EXISTS dm_threads (
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  other_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, other_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_threads_player
  ON dm_threads(player_id, updated_at DESC);
