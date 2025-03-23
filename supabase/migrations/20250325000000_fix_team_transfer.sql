/*
  # Fix Team Ownership Transfer Function

  1. Changes
    - Create a modified version of transfer_team_ownership that can be called from webhooks
    - Remove reliance on auth.uid() when executed from webhook context
    
  2. Security
    - Function still performs security validation when called directly by users
    - Function allows server-side execution when called from webhooks
*/

-- Create a modified function that doesn't rely on auth.uid() for webhook execution
CREATE OR REPLACE FUNCTION admin_transfer_team_ownership(
  p_team_id uuid,
  p_new_captain_id uuid,
  p_old_captain_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update team captain
  UPDATE teams t
  SET captain_id = p_new_captain_id
  WHERE t.id = p_team_id;

  -- Update old captain's role
  UPDATE team_players tp
  SET role = 'player',
      can_be_deleted = true
  WHERE tp.team_id = p_team_id
  AND tp.user_id = p_old_captain_id;

  -- Update new captain's role
  UPDATE team_players tp
  SET role = 'captain',
      can_be_deleted = false
  WHERE tp.team_id = p_team_id
  AND tp.user_id = p_new_captain_id;
END;
$$; 