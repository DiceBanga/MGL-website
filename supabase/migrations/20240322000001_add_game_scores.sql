-- Add score columns to games table
ALTER TABLE games
ADD COLUMN home_score integer,
ADD COLUMN away_score integer;

-- Add indexes for performance
CREATE INDEX idx_games_scheduled_at ON games(scheduled_at);
CREATE INDEX idx_games_status ON games(status);

COMMENT ON COLUMN games.home_score IS 'The score of the home team';
COMMENT ON COLUMN games.away_score IS 'The score of the away team'; 