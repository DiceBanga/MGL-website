/*
  # Fix team join policies and add direct join function

  1. Changes
    - Add direct team join function
    - Update team_players policies
    - Add team membership validation

  2. Security
    - Ensure proper access control
    - Validate team membership status
    - Prevent duplicate memberships
*/

-- Drop existing team_players policies
DROP POLICY IF EXISTS "Enable read access for all users" ON team_players;
DROP POLICY IF EXISTS "Enable team captains to add members" ON team_players;
DROP POLICY IF EXISTS "Enable team captains to manage members" ON team_players;

-- Create updated team_players policies
CREATE POLICY "Anyone can read team members"
  ON team_players FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can join teams"
  ON team_players FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM team_players tp
      WHERE tp.team_id = team_players.team_id
      AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Team captains can manage members"
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

-- Create function for direct team joining
CREATE OR REPLACE FUNCTION join_team(team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM team_players
    WHERE team_players.team_id = join_team.team_id
    AND team_players.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already a member of this team';
  END IF;

  -- Insert new team member
  INSERT INTO team_players (team_id, user_id, role, can_be_deleted)
  VALUES (join_team.team_id, auth.uid(), 'player', true);
END;
$$;