/*
  # Update leagues table with additional fields

  1. New Fields
    - `registration_start_date` (date) - When registration opens
    - `season_start_date` (date) - When the season begins
    - `playoff_start_date` (date) - When playoffs begin
    - `entry_fee` (numeric) - Regular entry fee
    - `late_entry_fee` (numeric) - Fee for late registration
    - `prize_amount` (numeric) - Total prize pool amount
  
  2. Changes
    - Add new columns to the leagues table
*/

-- Add new columns to leagues table
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS registration_start_date date,
ADD COLUMN IF NOT EXISTS season_start_date date,
ADD COLUMN IF NOT EXISTS playoff_start_date date,
ADD COLUMN IF NOT EXISTS entry_fee numeric DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS late_entry_fee numeric DEFAULT 150.00,
ADD COLUMN IF NOT EXISTS prize_amount numeric DEFAULT 1000.00;