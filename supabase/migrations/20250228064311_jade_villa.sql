/*
  # Fix tournament status constraint

  1. Changes
     - Update the tournaments_status_check constraint to include all valid status values
     - Ensures compatibility with the frontend application
*/

-- Drop the existing constraint
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_status_check;

-- Add the updated constraint with all valid status values
ALTER TABLE tournaments 
  ADD CONSTRAINT tournaments_status_check 
  CHECK (status IN ('upcoming', 'registration', 'active', 'completed', 'cancelled'));