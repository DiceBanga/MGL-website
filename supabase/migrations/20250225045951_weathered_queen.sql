-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tournament_registrations_updated_at
  BEFORE UPDATE ON tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_league_registrations_updated_at
  BEFORE UPDATE ON league_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_rosters_updated_at
  BEFORE UPDATE ON tournament_rosters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_league_rosters_updated_at
  BEFORE UPDATE ON league_rosters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for tournament registrations" ON tournament_registrations;
DROP POLICY IF EXISTS "Enable team captains to register for tournaments" ON tournament_registrations;
DROP POLICY IF EXISTS "Enable team captains to manage tournament registrations" ON tournament_registrations;
DROP POLICY IF EXISTS "Enable read access for league registrations" ON league_registrations;
DROP POLICY IF EXISTS "Enable team captains to register for leagues" ON league_registrations;
DROP POLICY IF EXISTS "Enable team captains to manage league registrations" ON league_registrations;
DROP POLICY IF EXISTS "Enable read access for tournament rosters" ON tournament_rosters;
DROP POLICY IF EXISTS "Enable team captains to manage tournament rosters" ON tournament_rosters;
DROP POLICY IF EXISTS "Enable read access for league rosters" ON league_rosters;
DROP POLICY IF EXISTS "Enable team captains to manage league rosters" ON league_rosters;

-- Create policies for Tournament Registrations
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

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS register_for_tournament(uuid, uuid, uuid[]);
DROP FUNCTION IF EXISTS register_for_league(uuid, uuid, integer, uuid[]);
DROP FUNCTION IF EXISTS update_tournament_roster(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS update_league_roster(uuid, uuid, uuid);

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