-- Trade Post purchases. One row per confirmed purchase.
--
-- id is the client's purchase key, generated when the review sheet opens, so
-- a refresh or a double tap that sends the same key hits the primary key and
-- is answered with the result already granted rather than granted again.
-- window_key is the shelf window the purchase counted against ('w:<index>'
-- for weekly, 'm:<yyyy-mm>' for monthly, both in RST).
-- No semicolons in these comments: wrangler splits the file on them.
CREATE TABLE trade_purchases (
  id         TEXT PRIMARY KEY,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  offer_id   TEXT NOT NULL,
  window_key TEXT NOT NULL,
  asset_id   TEXT,
  package    TEXT,
  route      TEXT NOT NULL,
  cost       INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- The limit check counts a player's purchases of one offer in one window.
CREATE INDEX trade_purchases_window ON trade_purchases (player_id, offer_id, window_key);
