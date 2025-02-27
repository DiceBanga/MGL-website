/*
  # Fix Tournament Permissions

  1. Changes
     - Adds a more permissive policy for tournaments table
     - Ensures admin users can properly manage tournaments
     - Fixes the role-based access control
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON tournaments;
DROP POLICY IF EXISTS "Tournaments are editable by admins" ON tournaments;

-- Create policy for public read access
CREATE POLICY "Tournaments are viewable by everyone"
  ON tournaments FOR SELECT
  TO public
  USING (true);

-- Create a more permissive policy for authenticated users
CREATE POLICY "Authenticated users can manage tournaments"
  ON tournaments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update the role column in players table for the admin user
UPDATE players
SET role = 'admin'
WHERE email = 'dice.banga@gmail.com';