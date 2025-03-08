/*
  # Optimize Team Registrations Performance

  1. New Indexes
    - Add composite indexes for frequently queried fields
    - Add indexes for foreign key relationships
    - Add index for registration status lookups
  
  2. Changes
    - Add indexes to improve query performance
    - Add timestamp index for sorting
*/

-- Add composite index for tournament registrations
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_team_status 
ON tournament_registrations(team_id, status, registration_date);

-- Add composite index for league registrations
CREATE INDEX IF NOT EXISTS idx_league_registrations_team_status 
ON league_registrations(team_id, status, registration_date);

-- Add index for payment status lookups
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_payment 
ON tournament_registrations(payment_status, tournament_id);

CREATE INDEX IF NOT EXISTS idx_league_registrations_payment 
ON league_registrations(payment_status, league_id);

-- Add index for registration dates
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_date 
ON tournament_registrations(registration_date DESC);

CREATE INDEX IF NOT EXISTS idx_league_registrations_date 
ON league_registrations(registration_date DESC);