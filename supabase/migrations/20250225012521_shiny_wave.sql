/*
  # Fix Database Relationships

  1. Changes
    - Add user_id foreign key to team_players table
    - Update team_players query in UserProfile
    - Add missing indexes

  2. Security
    - Update RLS policies for team_players
*/

-- Update team_players table to properly reference players
ALTER TABLE team_players
DROP CONSTRAINT IF EXISTS team_players_user_id_fkey,
ADD CONSTRAINT team_players_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES players(user_id)
  ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_players_user_id_team_id ON team_players(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);

-- Update RLS policies
CREATE POLICY "Users can view their own team memberships"
ON team_players FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Team captains can manage team members"
ON team_players FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_players.team_id
    AND teams.captain_id = auth.uid()
  )
);