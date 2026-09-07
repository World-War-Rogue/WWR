-- Audit log for the development-only progression seed tools
-- (worker/devProgression.ts). One row per seed action, written in the same
-- transaction as the seed itself. The routes that write here answer 404
-- unless ALLOW_DEV_PROGRESSION_SEEDS is "true", which only env.test sets.
-- No semicolons in these comments: wrangler splits the file on them.
CREATE TABLE dev_seed_log (
  id         TEXT PRIMARY KEY,
  actor_id   TEXT NOT NULL,
  target_id  TEXT NOT NULL,
  action     TEXT NOT NULL,
  params     TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX dev_seed_log_time ON dev_seed_log (created_at);
