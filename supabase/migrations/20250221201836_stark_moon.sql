/*
  # Initial Schema for Militia Gaming League

  1. Core Tables
    - users (handled by Supabase Auth)
    - leagues
    - tournaments
    - teams
    - players
    - games
    - standings
    - news
    - statistics
    - sponsors

  2. Junction Tables
    - league_admins
    - team_players
    - tournament_sponsors
    - league_sponsors

  3. Security
    - RLS enabled on all tables
    - Policies for:
      - Public read access where appropriate
      - Admin write access
      - User-specific access controls
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Leagues
CREATE TABLE leagues (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  logo_url text,
  banner_url text,
  website text,
  email text,
  timezone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- League Admins (Junction Table)
CREATE TABLE league_admins (
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);

-- Tournaments
CREATE TABLE tournaments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  logo_url text,
  banner_url text,
  website text,
  timezone text,
  theme jsonb,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Teams
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL,
  name text NOT NULL,
  logo_url text,
  banner_url text,
  website text,
  email text,
  phone text,
  timezone text,
  language text DEFAULT 'en',
  captain_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team Players (Junction Table)
CREATE TABLE team_players (
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'player' CHECK (role IN ('captain', 'player', 'substitute')),
  jersey_number integer,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- Players (Extended User Profile)
CREATE TABLE players (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL,
  phone text,
  timezone text,
  language text DEFAULT 'en',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Games
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  home_team_id uuid REFERENCES teams(id),
  away_team_id uuid REFERENCES teams(id),
  name text NOT NULL,
  description text,
  banner_url text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Box Scores
CREATE TABLE box_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(user_id),
  team_id uuid REFERENCES teams(id),
  games_played integer DEFAULT 1,
  field_goals_made integer DEFAULT 0,
  field_goals_attempted integer DEFAULT 0,
  three_points_made integer DEFAULT 0,
  three_points_attempted integer DEFAULT 0,
  free_throws_made integer DEFAULT 0,
  free_throws_attempted integer DEFAULT 0,
  rebounds integer DEFAULT 0,
  assists integer DEFAULT 0,
  steals integer DEFAULT 0,
  blocks integer DEFAULT 0,
  turnovers integer DEFAULT 0,
  fouls integer DEFAULT 0,
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Standings
CREATE TABLE standings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  points_for integer DEFAULT 0,
  points_against integer DEFAULT 0,
  rank integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tournament_id, team_id)
);

-- News
CREATE TABLE news (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  banner_url text,
  website text,
  country text,
  timezone text,
  language text DEFAULT 'en',
  theme jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Statistics (For both players and teams)
CREATE TABLE statistics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid REFERENCES players(user_id),
  team_id uuid REFERENCES teams(id),
  tournament_id uuid REFERENCES tournaments(id),
  stats_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (player_id IS NOT NULL AND team_id IS NULL) OR
    (team_id IS NOT NULL AND player_id IS NULL)
  )
);

-- Sponsors
CREATE TABLE sponsors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  logo_url text,
  banner_url text,
  website text,
  timezone text,
  language text DEFAULT 'en',
  theme jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tournament Sponsors (Junction Table)
CREATE TABLE tournament_sponsors (
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  sponsor_id uuid REFERENCES sponsors(id) ON DELETE CASCADE,
  sponsorship_level text DEFAULT 'standard' CHECK (sponsorship_level IN ('title', 'platinum', 'gold', 'silver', 'bronze', 'standard')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tournament_id, sponsor_id)
);

-- League Sponsors (Junction Table)
CREATE TABLE league_sponsors (
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  sponsor_id uuid REFERENCES sponsors(id) ON DELETE CASCADE,
  sponsorship_level text DEFAULT 'standard' CHECK (sponsorship_level IN ('title', 'platinum', 'gold', 'silver', 'bronze', 'standard')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (league_id, sponsor_id)
);

-- Enable Row Level Security
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_sponsors ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Leagues: Public read, admin write
CREATE POLICY "Leagues are viewable by everyone"
  ON leagues FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Leagues are editable by admins"
  ON leagues FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_admins
      WHERE league_admins.league_id = leagues.id
      AND league_admins.user_id = auth.uid()
    )
  );

-- Players: Public read, self write
CREATE POLICY "Players are viewable by everyone"
  ON players FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Players can edit their own profile"
  ON players FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Teams: Public read, admin write
CREATE POLICY "Teams are viewable by everyone"
  ON teams FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Teams are editable by team captains"
  ON teams FOR ALL
  TO authenticated
  USING (captain_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_league_admins_user_id ON league_admins(user_id);
CREATE INDEX idx_team_players_user_id ON team_players(user_id);
CREATE INDEX idx_games_tournament_id ON games(tournament_id);
CREATE INDEX idx_box_scores_game_id ON box_scores(game_id);
CREATE INDEX idx_standings_tournament_id ON standings(tournament_id);
CREATE INDEX idx_statistics_player_id ON statistics(player_id);
CREATE INDEX idx_statistics_team_id ON statistics(team_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_leagues_updated_at
    BEFORE UPDATE ON leagues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
    BEFORE UPDATE ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_box_scores_updated_at
    BEFORE UPDATE ON box_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_updated_at
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsors_updated_at
    BEFORE UPDATE ON sponsors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();