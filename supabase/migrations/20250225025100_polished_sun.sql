/*
  # Team Management System Update

  1. New Tables
    - `team_join_requests` for handling team join applications
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `user_id` (uuid, references players)
      - `status` (text, check constraint)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `can_be_deleted` flag to team_players
    - Set captain entries to non-deletable
    - Add team ownership transfer function

  3. Security
    - Enable RLS on new table
    - Add policies for join requests
    - Update team member management policies
*/

-- Create team join requests table
CREATE TABLE team_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES players(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Add can_be_deleted flag to team_players
ALTER TABLE team_players
ADD COLUMN can_be_deleted boolean DEFAULT true;

-- Set captain entries to can_be_deleted = false
UPDATE team_players
SET can_be_deleted = false
WHERE role = 'captain';

-- Create trigger to update updated_at
CREATE TRIGGER update_team_join_requests_updated_at
  BEFORE UPDATE ON team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for team join requests
CREATE POLICY "Users can create join requests"
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

CREATE POLICY "Users can view their own join requests"
  ON team_join_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team captains can view and manage join requests"
  ON team_join_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_join_requests.team_id
      AND teams.captain_id = auth.uid()
    )
  );

-- Update team_players policies
DROP POLICY IF EXISTS "Team captains can manage team members" ON team_players;

CREATE POLICY "Team captains can manage team members except captains"
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

CREATE POLICY "Team captains can add members"
  ON team_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_players.team_id
      AND teams.captain_id = auth.uid()
    )
  );

-- Create function to transfer team ownership
CREATE OR REPLACE FUNCTION transfer_team_ownership(
  team_id uuid,
  new_captain_id uuid
) RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_id
    AND captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to transfer team ownership';
  END IF;

  -- Update team captain
  UPDATE teams
  SET captain_id = new_captain_id
  WHERE id = team_id;

  -- Update team_players roles
  UPDATE team_players
  SET role = 'player',
      can_be_deleted = true
  WHERE team_id = team_id
  AND user_id = auth.uid();

  UPDATE team_players
  SET role = 'captain',
      can_be_deleted = false
  WHERE team_id = team_id
  AND user_id = new_captain_id;
END;
$$;