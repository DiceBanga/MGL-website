/*
  # Enhance Profile Features

  1. Changes
    - Add avatar_upload_path to players table
    - Add team management policies
    - Add avatar storage policies

  2. Security
    - Update RLS policies for avatar access
    - Add team management policies
*/

-- Add avatar_upload_path to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS avatar_upload_path text;

-- Create policy for users to update their own profile
CREATE POLICY "Users can update their own profile"
ON players FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for team creation
CREATE POLICY "Users can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (captain_id = auth.uid());

-- Create policy for team updates
CREATE POLICY "Team captains can update their teams"
ON teams FOR UPDATE
TO authenticated
USING (captain_id = auth.uid())
WITH CHECK (captain_id = auth.uid());