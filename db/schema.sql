CREATE TABLE IF NOT EXISTS game_records (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT NOT NULL,
  level_reached INTEGER NOT NULL,
  enemies_killed INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_records_created_at_idx
  ON game_records (created_at DESC);

CREATE INDEX IF NOT EXISTS game_records_player_id_idx
  ON game_records (player_id);
