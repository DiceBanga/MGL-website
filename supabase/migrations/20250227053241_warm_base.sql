/*
  # Add prize_pool column to tournaments table

  1. Changes
    - Add prize_pool column to tournaments table if it doesn't exist
*/

-- Add prize_pool column to tournaments table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' 
    AND column_name = 'prize_pool'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN prize_pool text;
  END IF;
END $$;