/*
  # Add Team Description

  1. Changes
    - Add description column to teams table
    - Update team policies

  2. Security
    - Maintain existing RLS policies
*/

-- Add description column to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS description text;

-- Update team policies to include description field
DROP POLICY IF EXISTS "Team captains can update their teams" ON teams;
CREATE POLICY "Team captains can update their teams"
ON teams FOR UPDATE
TO authenticated
USING (captain_id = auth.uid())
WITH CHECK (captain_id = auth.uid());

-- Ensure public can view team descriptions
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
CREATE POLICY "Teams are viewable by everyone"
ON teams FOR SELECT
TO public
USING (true);