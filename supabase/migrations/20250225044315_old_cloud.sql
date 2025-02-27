/*
  # Tournament and League Registration System

  1. New Tables
    - tournament_registrations: Track team registrations for tournaments
    - league_registrations: Track team registrations for leagues
    - tournament_rosters: Track participating players in tournaments
    - league_rosters: Track participating players in leagues

  2. Security
    - Enable RLS on all new tables
    - Add policies for team captains to manage registrations
    - Add policies for roster management

  3. Functions
    - register_for_tournament: Handle tournament registration process
    - register_for_league: Handle league registration process
    - update_tournament_roster: Manage tournament roster changes
    - update_league_roster: Manage league roster changes
*/

-- Tournament Registrations
CREATE TABLE tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  registration_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

-- League Registrations
CREATE TABLE league_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  season integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  registration_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(league_id, team_id, season)
);

-- Tournament Rosters
CREATE TABLE tournament_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES tournament_registrations(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(user_id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'substitute')),
  jersey_number integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(registration_id, player_id)
);

-- League Rosters
CREATE TABLE league_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES league_registrations(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(user_id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'substitute')),
  jersey_number integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(registration_id, player_id)
);

-- Enable RLS
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_rosters ENABLE ROW LEVEL SECURITY;

-- Policies for Tournament Registrations
CREATE POLICY "Enable read access for tournament registrations"
  ON tournament_registrations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable team captains to register for tournaments"
  ON tournament_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tournament_registrations.team_id
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Enable team captains to manage tournament registrations"
  ON tournament_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tournament_registrations.team_id
      AND teams.captain_id = auth.uid()
    )
  );

-- Policies for League Registrations
CREATE POLICY "Enable read access for league registrations"
  ON league_registrations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable team captains to register for leagues"
  ON league_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = league_registrations.team_id
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Enable team captains to manage league registrations"
  ON league_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = league_registrations.team_id
      AND teams.captain_id = auth.uid()
    )
  );

-- Policies for Tournament Rosters
CREATE POLICY "Enable read access for tournament rosters"
  ON tournament_rosters FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable team captains to manage tournament rosters"
  ON tournament_rosters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournament_registrations tr
      JOIN teams t ON t.id = tr.team_id
      WHERE tr.id = tournament_rosters.registration_id
      AND t.captain_id = auth.uid()
    )
  );

-- Policies for League Rosters
CREATE POLICY "Enable read access for league rosters"
  ON league_rosters FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable team captains to manage league rosters"
  ON league_rosters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_registrations lr
      JOIN teams t ON t.id = lr.team_id
      WHERE lr.id = league_rosters.registration_id
      AND t.captain_id = auth.uid()
    )
  );

-- Function to register for a tournament
CREATE OR REPLACE FUNCTION register_for_tournament(
  p_tournament_id uuid,
  p_team_id uuid,
  p_player_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registration_id uuid;
  v_player_id uuid;
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id
    AND captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to register team for tournament';
  END IF;

  -- Verify all players are team members
  IF EXISTS (
    SELECT 1 FROM unnest(p_player_ids) player_id
    WHERE NOT EXISTS (
      SELECT 1 FROM team_players
      WHERE team_id = p_team_id
      AND user_id = player_id
    )
  ) THEN
    RAISE EXCEPTION 'All players must be team members';
  END IF;

  -- Create tournament registration
  INSERT INTO tournament_registrations (tournament_id, team_id)
  VALUES (p_tournament_id, p_team_id)
  RETURNING id INTO v_registration_id;

  -- Add players to tournament roster
  FOREACH v_player_id IN ARRAY p_player_ids
  LOOP
    INSERT INTO tournament_rosters (registration_id, player_id)
    VALUES (v_registration_id, v_player_id);
  END LOOP;

  RETURN v_registration_id;
END;
$$;

-- Function to register for a league
CREATE OR REPLACE FUNCTION register_for_league(
  p_league_id uuid,
  p_team_id uuid,
  p_season integer,
  p_player_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registration_id uuid;
  v_player_id uuid;
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id
    AND captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to register team for league';
  END IF;

  -- Verify all players are team members
  IF EXISTS (
    SELECT 1 FROM unnest(p_player_ids) player_id
    WHERE NOT EXISTS (
      SELECT 1 FROM team_players
      WHERE team_id = p_team_id
      AND user_id = player_id
    )
  ) THEN
    RAISE EXCEPTION 'All players must be team members';
  END IF;

  -- Create league registration
  INSERT INTO league_registrations (league_id, team_id, season)
  VALUES (p_league_id, p_team_id, p_season)
  RETURNING id INTO v_registration_id;

  -- Add players to league roster
  FOREACH v_player_id IN ARRAY p_player_ids
  LOOP
    INSERT INTO league_rosters (registration_id, player_id)
    VALUES (v_registration_id, v_player_id);
  END LOOP;

  RETURN v_registration_id;
END;
$$;

-- Function to update tournament roster
CREATE OR REPLACE FUNCTION update_tournament_roster(
  p_registration_id uuid,
  p_player_id uuid,
  p_new_player_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM tournament_registrations tr
    JOIN teams t ON t.id = tr.team_id
    WHERE tr.id = p_registration_id
    AND t.captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to update tournament roster';
  END IF;

  -- Verify new player is a team member
  IF NOT EXISTS (
    SELECT 1 FROM tournament_registrations tr
    JOIN team_players tp ON tp.team_id = tr.team_id
    WHERE tr.id = p_registration_id
    AND tp.user_id = p_new_player_id
  ) THEN
    RAISE EXCEPTION 'New player must be a team member';
  END IF;

  -- Update roster
  UPDATE tournament_rosters
  SET player_id = p_new_player_id
  WHERE registration_id = p_registration_id
  AND player_id = p_player_id;
END;
$$;

-- Function to update league roster
CREATE OR REPLACE FUNCTION update_league_roster(
  p_registration_id uuid,
  p_player_id uuid,
  p_new_player_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM league_registrations lr
    JOIN teams t ON t.id = lr.team_id
    WHERE lr.id = p_registration_id
    AND t.captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to update league roster';
  END IF;

  -- Verify new player is a team member
  IF NOT EXISTS (
    SELECT 1 FROM league_registrations lr
    JOIN team_players tp ON tp.team_id = lr.team_id
    WHERE lr.id = p_registration_id
    AND tp.user_id = p_new_player_id
  ) THEN
    RAISE EXCEPTION 'New player must be a team member';
  END IF;

  -- Update roster
  UPDATE league_rosters
  SET player_id = p_new_player_id
  WHERE registration_id = p_registration_id
  AND player_id = p_player_id;
END;
$$;