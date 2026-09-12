-- Group conversations, and translation.
--
-- A group is a private channel with more than two people in it. It reuses the
-- messages table like every other channel; what it adds is a name, and a
-- membership list that decides who may read it.

CREATE TABLE IF NOT EXISTS chat_groups (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES players(id),
  created_at INTEGER NOT NULL
);

-- Membership IS the permission. There is no owner and no admin: anybody
-- already inside may bring somebody else in, which is what a group chat is,
-- and the cap is what stops it becoming a broadcast channel.
CREATE TABLE IF NOT EXISTS chat_group_members (
  group_id  TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  added_at  INTEGER NOT NULL,
  PRIMARY KEY (group_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_player
  ON chat_group_members(player_id);

-- The language a message was actually typed in, recorded at send time rather
-- than read from the author later. Somebody who switches language should not
-- retroactively change what their old messages claim to be written in.
ALTER TABLE messages ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';

-- Translations are cached per message per target language, so a message read
-- by twenty English speakers is translated once rather than twenty times.
-- Without this the cost of a busy channel is the cost of translating it
-- multiplied by how many people are watching.
CREATE TABLE IF NOT EXISTS message_translations (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  lang       TEXT NOT NULL,
  body       TEXT NOT NULL,
  PRIMARY KEY (message_id, lang)
);
