/*
  # Fix team ownership transfer function

  1. Changes
    - Fix ambiguous team_id reference in transfer_team_ownership function
    - Add explicit table aliases
    - Improve error handling

  2. Security
    - Maintain existing security checks
    - Use explicit table references
*/

-- Drop existing function
DROP FUNCTION IF EXISTS transfer_team_ownership(uuid, uuid);

-- Create updated function with fixed column references
CREATE OR REPLACE FUNCTION transfer_team_ownership(
  p_team_id uuid,
  p_new_captain_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = p_team_id
    AND t.captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to transfer team ownership';
  END IF;

  -- Update team captain
  UPDATE teams t
  SET captain_id = p_new_captain_id
  WHERE t.id = p_team_id;

  -- Update old captain's role
  UPDATE team_players tp
  SET role = 'player',
      can_be_deleted = true
  WHERE tp.team_id = p_team_id
  AND tp.user_id = auth.uid();

  -- Update new captain's role
  UPDATE team_players tp
  SET role = 'captain',
      can_be_deleted = false
  WHERE tp.team_id = p_team_id
  AND tp.user_id = p_new_captain_id;
END;
$$;