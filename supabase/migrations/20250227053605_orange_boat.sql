/*
  # Fix Row-Level Security Policies for Tournaments Table

  1. Changes
    - Update RLS policies for tournaments table to allow admin users to create and manage tournaments
    - Add policy for authenticated users to view tournaments
    - Add policy for admin users to manage tournaments
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON tournaments;
DROP POLICY IF EXISTS "Tournaments are editable by admins" ON tournaments;

-- Create policy for public read access
CREATE POLICY "Tournaments are viewable by everyone"
  ON tournaments FOR SELECT
  TO public
  USING (true);

-- First check if the role column exists in players table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE players ADD COLUMN role text DEFAULT 'user';
  END IF;
END $$;

-- Create policy for admin write access
CREATE POLICY "Tournaments are editable by admins"
  ON tournaments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE user_id = auth.uid()
      AND players.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE user_id = auth.uid()
      AND players.role = 'admin'
    )
  );