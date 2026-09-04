-- Mentions and replies.
--
-- Both exist for the same reason: a channel with several conversations running
-- at once is unreadable without them. A reply says which conversation a line
-- belongs to; a mention says which line was aimed at you.

-- What this message is answering. Null for most messages.
--
-- ON DELETE SET NULL rather than CASCADE: deleting a message must not delete
-- the replies to it. The thread survives with its opening line missing, which
-- is a gap; cascading would silently remove other people's messages, which is
-- data loss.
ALTER TABLE messages ADD COLUMN reply_to TEXT REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);

-- Who was named in a message.
--
-- Resolved once at send time and stored, rather than re-scanned on every read.
-- Scanning on read would make the badge query depend on parsing every message
-- in the channel, and it would let a callsign change silently re-point an old
-- mention at somebody who was never being spoken to.
--
-- `channel` is denormalised so counting a player's unread mentions is one
-- indexed read with no join to messages at all - it is on screen constantly.
CREATE TABLE IF NOT EXISTS message_mentions (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  -- Null until the player has actually looked at it. Separate from
  -- channel_reads on purpose: opening a busy channel and scrolling past should
  -- not silently clear a mention somebody is waiting on an answer to.
  seen_at    INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_mentions_unique
  ON message_mentions(message_id, player_id);

-- The badge query: unseen mentions for one player, newest first.
CREATE INDEX IF NOT EXISTS idx_message_mentions_pending
  ON message_mentions(player_id, seen_at, created_at DESC);
