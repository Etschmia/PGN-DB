-- PGN-Datenbank Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verify_token VARCHAR(64),
  verify_expires TIMESTAMPTZ,
  reset_token VARCHAR(64),
  reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event VARCHAR(255) DEFAULT 'Unknown',
  site VARCHAR(255) DEFAULT 'Unknown',
  date VARCHAR(20) DEFAULT '????.??.??',
  white VARCHAR(255) DEFAULT 'Unknown',
  black VARCHAR(255) DEFAULT 'Unknown',
  result VARCHAR(15) DEFAULT '*',
  eco VARCHAR(10) DEFAULT '',
  opening VARCHAR(500) DEFAULT '',
  white_elo VARCHAR(10),
  black_elo VARCHAR(10),
  pgn TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  move_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_user_white ON games(user_id, white);
CREATE INDEX IF NOT EXISTS idx_games_user_black ON games(user_id, black);
CREATE INDEX IF NOT EXISTS idx_games_user_date ON games(user_id, date);
CREATE INDEX IF NOT EXISTS idx_games_user_opening ON games(user_id, opening);
