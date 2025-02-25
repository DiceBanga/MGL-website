/*
  # Fix team join and management policies

  1. Changes
    - Add comprehensive RLS policies for team_players table
    - Add policies for team join requests
    - Fix team membership management

  2. Security
    - Enable proper access control for team operations
    - Ensure team captains can manage their teams
    - Allow users to join teams through requests
*/

-- Drop existing team_players policies to avoid conflicts
DROP POLICY IF EXISTS "Team captains can manage team members" ON team_players;
DROP POLICY IF EXISTS "Team captains can manage non-captain members" ON team_players;
DROP POLICY IF EXISTS "Team captains can add members" ON team_players;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON team_players;

-- Create comprehensive policies for team_players
CREATE POLICY "Enable read access for all users"
  ON team_players FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable team captains to add members"
  ON team_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_players.team_id
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Enable team captains to manage members"
  ON team_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_players.team_id
      AND teams.captain_id = auth.uid()
    )
    AND can_be_deleted = true
  );

-- Drop existing team join request policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create join requests" ON team_join_requests;
DROP POLICY IF EXISTS "Users can view their own join requests" ON team_join_requests;
DROP POLICY IF EXISTS "Team captains can view and manage join requests" ON team_join_requests;

-- Create comprehensive policies for team_join_requests
CREATE POLICY "Enable read access for team join requests"
  ON team_join_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_join_requests.team_id
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Enable users to create join requests"
  ON team_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    status = 'pending' AND
    NOT EXISTS (
      SELECT 1 FROM team_players
      WHERE team_players.team_id = team_join_requests.team_id
      AND team_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Enable team captains to manage join requests"
  ON team_join_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_join_requests.team_id
      AND teams.captain_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_join_requests.team_id
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Enable team captains to delete join requests"
  ON team_join_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_join_requests.team_id
      AND teams.captain_id = auth.uid()
    )
  );

-- Create function to handle team join request approval
CREATE OR REPLACE FUNCTION approve_team_join_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_user_id uuid;
BEGIN
  -- Get request details
  SELECT team_id, user_id INTO v_team_id, v_user_id
  FROM team_join_requests
  WHERE id = request_id;

  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = v_team_id
    AND captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve join requests';
  END IF;

  -- Update request status
  UPDATE team_join_requests
  SET status = 'approved'
  WHERE id = request_id;

  -- Add player to team
  INSERT INTO team_players (team_id, user_id, role, can_be_deleted)
  VALUES (v_team_id, v_user_id, 'player', true);
END;
$$;