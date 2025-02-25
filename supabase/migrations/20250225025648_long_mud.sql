/*
  # Update Team Management Policies and Functions

  1. Changes
    - Add can_be_deleted flag to team_players
    - Update team management policies
    - Add team ownership transfer function
    
  2. Security
    - Update RLS policies for team management
    - Add security checks for team ownership transfer
*/

-- Add can_be_deleted flag to team_players if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_players' 
    AND column_name = 'can_be_deleted'
  ) THEN
    ALTER TABLE team_players
    ADD COLUMN can_be_deleted boolean DEFAULT true;
  END IF;
END $$;

-- Set captain entries to can_be_deleted = false
UPDATE team_players
SET can_be_deleted = false
WHERE role = 'captain';

-- Update team_players policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Team captains can manage team members" ON team_players;
  DROP POLICY IF EXISTS "Team captains can manage non-captain members" ON team_players;
  DROP POLICY IF EXISTS "Team captains can add members" ON team_players;

  -- Create new policies only if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_players' 
    AND policyname = 'Team captains can manage non-captain members'
  ) THEN
    CREATE POLICY "Team captains can manage non-captain members"
      ON team_players FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM teams
          WHERE teams.id = team_players.team_id
          AND teams.captain_id = auth.uid()
        ) AND
        can_be_deleted = true
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_players' 
    AND policyname = 'Team captains can add members'
  ) THEN
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
  END IF;
END $$;

-- Create function to transfer team ownership if it doesn't exist
CREATE OR REPLACE FUNCTION transfer_team_ownership(
  team_id uuid,
  new_captain_id uuid
) RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;