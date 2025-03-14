/*
  # Add Owner Role for Attica

  1. Changes
     - Updates auth.users metadata to set owner role
     - Updates players table to set owner role
     - Ensures proper role-based access control for owner
*/

-- First, update the auth.users metadata to set owner role
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"owner"'
)
WHERE email = 'attica@militiagaming.gg';

-- Then update the players table
UPDATE players
SET role = 'owner'
WHERE email = 'attica@militiagaming.gg';

-- Create owner-specific policies
CREATE POLICY "Owners can manage all content"
  ON players FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'owner'
    )
  ); 