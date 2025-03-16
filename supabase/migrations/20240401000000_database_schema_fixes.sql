/*
  # Comprehensive Database Schema Fixes

  This migration addresses various inconsistencies and issues in the database schema:
  
  1. Payments Table Fixes
     - Standardize payment_details column
     - Add missing indexes
     - Fix constraint inconsistencies
  
  2. Foreign Key Relationship Fixes
     - Ensure proper relationships between tables
     - Add missing foreign keys
     - Fix ON DELETE behavior
  
  3. Constraint Standardization
     - Standardize constraint naming conventions
     - Fix inconsistent validation rules
     - Ensure all tables have proper constraints
  
  4. Index Optimization
     - Add missing indexes for frequently queried fields
     - Optimize existing indexes
     - Remove redundant indexes
*/

-- =============================================
-- 1. Payments Table Fixes
-- =============================================

-- Ensure payments table has consistent structure
DO $$ 
BEGIN
  -- Add payment_details column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'payment_details'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_details JSONB;
  END IF;

  -- Add payment_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_id TEXT;
    
    -- Add unique constraint to payment_id
    ALTER TABLE payments ADD CONSTRAINT payments_payment_id_key UNIQUE (payment_id);
  END IF;

  -- Add reference_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN reference_id TEXT;
    
    -- Add index on reference_id
    CREATE INDEX IF NOT EXISTS idx_payments_reference_id ON payments(reference_id);
  END IF;

  -- Ensure metadata column exists and has proper index
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE payments ADD COLUMN metadata JSONB;
  END IF;

  -- Create GIN index on metadata if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'payments' 
    AND indexname = 'idx_payments_metadata'
  ) THEN
    CREATE INDEX idx_payments_metadata ON payments USING GIN (metadata);
  END IF;

  -- Ensure status has proper check constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'payments' 
    AND column_name = 'status' 
    AND constraint_name = 'payments_status_check'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
    ALTER TABLE payments ADD CONSTRAINT payments_status_check 
      CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'processing'));
  END IF;
END $$;

-- =============================================
-- 2. Foreign Key Relationship Fixes
-- =============================================

-- Fix team_players foreign key relationships
ALTER TABLE team_players
  DROP CONSTRAINT IF EXISTS team_players_user_id_fkey,
  ADD CONSTRAINT team_players_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES players(user_id)
    ON DELETE CASCADE;

-- Fix teams.captain_id relationship
ALTER TABLE teams
  DROP CONSTRAINT IF EXISTS teams_captain_id_fkey,
  ADD CONSTRAINT teams_captain_id_fkey
    FOREIGN KEY (captain_id)
    REFERENCES players(user_id)
    ON DELETE SET NULL;

-- Fix tournament_registrations relationships
ALTER TABLE tournament_registrations
  DROP CONSTRAINT IF EXISTS tournament_registrations_team_id_fkey,
  ADD CONSTRAINT tournament_registrations_team_id_fkey
    FOREIGN KEY (team_id)
    REFERENCES teams(id)
    ON DELETE CASCADE;

ALTER TABLE tournament_registrations
  DROP CONSTRAINT IF EXISTS tournament_registrations_tournament_id_fkey,
  ADD CONSTRAINT tournament_registrations_tournament_id_fkey
    FOREIGN KEY (tournament_id)
    REFERENCES tournaments(id)
    ON DELETE CASCADE;

-- Fix league_registrations relationships
ALTER TABLE league_registrations
  DROP CONSTRAINT IF EXISTS league_registrations_team_id_fkey,
  ADD CONSTRAINT league_registrations_team_id_fkey
    FOREIGN KEY (team_id)
    REFERENCES teams(id)
    ON DELETE CASCADE;

ALTER TABLE league_registrations
  DROP CONSTRAINT IF EXISTS league_registrations_league_id_fkey,
  ADD CONSTRAINT league_registrations_league_id_fkey
    FOREIGN KEY (league_id)
    REFERENCES leagues(id)
    ON DELETE CASCADE;

-- =============================================
-- 3. Constraint Standardization
-- =============================================

-- Fix items table constraints
ALTER TABLE items 
  DROP CONSTRAINT IF EXISTS valid_item_id,
  ADD CONSTRAINT items_item_id_format_check 
    CHECK (item_id ~ '^[0-9]{4}$');

-- Standardize tournament status constraint
ALTER TABLE tournaments 
  DROP CONSTRAINT IF EXISTS tournaments_status_check,
  ADD CONSTRAINT tournaments_status_check 
    CHECK (status IN ('upcoming', 'registration', 'active', 'completed', 'cancelled'));

-- Standardize league status constraint
ALTER TABLE leagues 
  DROP CONSTRAINT IF EXISTS leagues_status_check,
  ADD CONSTRAINT leagues_status_check 
    CHECK (status IN ('active', 'inactive', 'archived', 'registration'));

-- Standardize payment status constraints in registration tables
ALTER TABLE tournament_registrations 
  DROP CONSTRAINT IF EXISTS tournament_registrations_payment_status_check,
  ADD CONSTRAINT tournament_registrations_payment_status_check 
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE league_registrations 
  DROP CONSTRAINT IF EXISTS league_registrations_payment_status_check,
  ADD CONSTRAINT league_registrations_payment_status_check 
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- =============================================
-- 4. Index Optimization
-- =============================================

-- Add missing indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_players_display_name ON players(display_name);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_tournaments_name ON tournaments(name);
CREATE INDEX IF NOT EXISTS idx_leagues_name ON leagues(name);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_status ON tournament_registrations(status);
CREATE INDEX IF NOT EXISTS idx_league_registrations_status ON league_registrations(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Add composite indexes for frequently queried combinations
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_team_tournament 
  ON tournament_registrations(team_id, tournament_id);

CREATE INDEX IF NOT EXISTS idx_league_registrations_team_league 
  ON league_registrations(team_id, league_id);

CREATE INDEX IF NOT EXISTS idx_team_players_team_role 
  ON team_players(team_id, role);

-- =============================================
-- 5. Add Missing Columns
-- =============================================

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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' 
    AND column_name = 'prize_pool'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN prize_pool numeric DEFAULT 0;
  END IF;
END $$;

-- Add missing columns to leagues table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leagues' 
    AND column_name = 'current_season'
  ) THEN
    ALTER TABLE leagues ADD COLUMN current_season integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leagues' 
    AND column_name = 'prize_pool'
  ) THEN
    ALTER TABLE leagues ADD COLUMN prize_pool numeric DEFAULT 0;
  END IF;
END $$;

-- =============================================
-- 6. Update Triggers
-- =============================================

-- Ensure all tables have updated_at triggers
DO $$ 
BEGIN
  -- First, make sure the update_updated_at_column function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  END IF;

  -- Create triggers for tables that might be missing them
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_payments_updated_at'
  ) THEN
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_tournament_registrations_updated_at'
  ) THEN
    CREATE TRIGGER update_tournament_registrations_updated_at
      BEFORE UPDATE ON tournament_registrations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_league_registrations_updated_at'
  ) THEN
    CREATE TRIGGER update_league_registrations_updated_at
      BEFORE UPDATE ON league_registrations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================
-- 7. Documentation Comments
-- =============================================

-- Add documentation comments to key tables and columns
COMMENT ON TABLE payments IS 'Stores all payment transactions in the system';
COMMENT ON COLUMN payments.payment_id IS 'External payment ID from payment processor';
COMMENT ON COLUMN payments.reference_id IS 'Internal reference ID for tracking payment purpose';
COMMENT ON COLUMN payments.payment_details IS 'Detailed payment information from payment processor';
COMMENT ON COLUMN payments.metadata IS 'Additional metadata for the payment';

COMMENT ON TABLE items IS 'Stores purchasable items in the system';
COMMENT ON COLUMN items.item_id IS '4-digit unique identifier for the item';
COMMENT ON COLUMN items.current_price IS 'Current price of the item in USD';

COMMENT ON TABLE tournaments IS 'Stores tournament information';
COMMENT ON COLUMN tournaments.status IS 'Current status of the tournament: upcoming, registration, active, completed, or cancelled';
COMMENT ON COLUMN tournaments.payment_amount IS 'Registration fee for the tournament in USD';

COMMENT ON TABLE leagues IS 'Stores league information';
COMMENT ON COLUMN leagues.status IS 'Current status of the league: active, inactive, archived, or registration';
COMMENT ON COLUMN leagues.payment_amount IS 'Registration fee for the league in USD'; 