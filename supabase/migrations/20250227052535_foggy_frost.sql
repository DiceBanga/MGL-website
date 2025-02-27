/*
  # Fix schema issues with teams and tournaments tables

  1. Changes
     - Add missing relationship between teams.captain_id and players.user_id
     - Add missing start_date and end_date columns to tournaments table
*/

-- Fix the relationship between teams.captain_id and players.user_id
ALTER TABLE teams
DROP CONSTRAINT IF EXISTS teams_captain_id_fkey,
ADD CONSTRAINT teams_captain_id_fkey
  FOREIGN KEY (captain_id)
  REFERENCES players(user_id)
  ON DELETE SET NULL;

-- Add missing date columns to tournaments table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' 
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' 
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN end_date date;
  END IF;
END $$;