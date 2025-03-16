-- Critical Database Schema Fixes
-- Run this script directly in the Supabase UI SQL Editor

-- 1. Payments Table Fixes
-- Add payment_details column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'payment_details'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_details JSONB;
    RAISE NOTICE 'Added payment_details column to payments table';
  ELSE
    RAISE NOTICE 'payment_details column already exists in payments table';
  END IF;

  -- Add payment_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_id TEXT;
    
    -- Add unique constraint to payment_id
    ALTER TABLE payments ADD CONSTRAINT payments_payment_id_key UNIQUE (payment_id);
    RAISE NOTICE 'Added payment_id column to payments table';
  ELSE
    RAISE NOTICE 'payment_id column already exists in payments table';
  END IF;

  -- Add reference_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN reference_id TEXT;
    RAISE NOTICE 'Added reference_id column to payments table';
  ELSE
    RAISE NOTICE 'reference_id column already exists in payments table';
  END IF;
END $$;

-- 2. Add missing columns to tournaments table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournaments' 
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN start_date DATE;
    RAISE NOTICE 'Added start_date column to tournaments table';
  ELSE
    RAISE NOTICE 'start_date column already exists in tournaments table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournaments' 
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN end_date DATE;
    RAISE NOTICE 'Added end_date column to tournaments table';
  ELSE
    RAISE NOTICE 'end_date column already exists in tournaments table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournaments' 
    AND column_name = 'prize_pool'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN prize_pool NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added prize_pool column to tournaments table';
  ELSE
    RAISE NOTICE 'prize_pool column already exists in tournaments table';
  END IF;
END $$;

-- 3. Add missing columns to leagues table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leagues' 
    AND column_name = 'prize_pool'
  ) THEN
    ALTER TABLE leagues ADD COLUMN prize_pool NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added prize_pool column to leagues table';
  ELSE
    RAISE NOTICE 'prize_pool column already exists in leagues table';
  END IF;
END $$;

-- 4. Fix team_players foreign key relationships
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'team_players_user_id_fkey' 
    AND table_name = 'team_players'
  ) THEN
    ALTER TABLE team_players DROP CONSTRAINT team_players_user_id_fkey;
    RAISE NOTICE 'Dropped existing team_players_user_id_fkey constraint';
  END IF;
  
  ALTER TABLE team_players 
  ADD CONSTRAINT team_players_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES players(user_id)
    ON DELETE CASCADE;
  RAISE NOTICE 'Added team_players_user_id_fkey constraint with ON DELETE CASCADE';
END $$;

-- 5. Fix teams.captain_id relationship
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'teams_captain_id_fkey' 
    AND table_name = 'teams'
  ) THEN
    ALTER TABLE teams DROP CONSTRAINT teams_captain_id_fkey;
    RAISE NOTICE 'Dropped existing teams_captain_id_fkey constraint';
  END IF;
  
  ALTER TABLE teams
  ADD CONSTRAINT teams_captain_id_fkey
    FOREIGN KEY (captain_id)
    REFERENCES players(user_id)
    ON DELETE SET NULL;
  RAISE NOTICE 'Added teams_captain_id_fkey constraint with ON DELETE SET NULL';
END $$;

-- 6. Add critical indexes
DO $$ 
BEGIN
  -- Add index on payments.reference_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_payments_reference_id'
  ) THEN
    CREATE INDEX idx_payments_reference_id ON payments(reference_id);
    RAISE NOTICE 'Created idx_payments_reference_id index';
  ELSE
    RAISE NOTICE 'idx_payments_reference_id index already exists';
  END IF;
  
  -- Add index on payments.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_payments_user_id'
  ) THEN
    CREATE INDEX idx_payments_user_id ON payments(user_id);
    RAISE NOTICE 'Created idx_payments_user_id index';
  ELSE
    RAISE NOTICE 'idx_payments_user_id index already exists';
  END IF;
  
  -- Add index on tournaments.status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_tournaments_status'
  ) THEN
    CREATE INDEX idx_tournaments_status ON tournaments(status);
    RAISE NOTICE 'Created idx_tournaments_status index';
  ELSE
    RAISE NOTICE 'idx_tournaments_status index already exists';
  END IF;
  
  -- Add index on leagues.status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_leagues_status'
  ) THEN
    CREATE INDEX idx_leagues_status ON leagues(status);
    RAISE NOTICE 'Created idx_leagues_status index';
  ELSE
    RAISE NOTICE 'idx_leagues_status index already exists';
  END IF;
END $$;

-- 7. Standardize tournament status constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tournaments_status_check' 
    AND table_name = 'tournaments'
  ) THEN
    ALTER TABLE tournaments DROP CONSTRAINT tournaments_status_check;
    RAISE NOTICE 'Dropped existing tournaments_status_check constraint';
  END IF;
  
  ALTER TABLE tournaments 
  ADD CONSTRAINT tournaments_status_check 
    CHECK (status IN ('upcoming', 'registration', 'active', 'completed', 'cancelled'));
  RAISE NOTICE 'Added tournaments_status_check constraint with standardized values';
END $$;

-- 8. Standardize league status constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leagues_status_check' 
    AND table_name = 'leagues'
  ) THEN
    ALTER TABLE leagues DROP CONSTRAINT leagues_status_check;
    RAISE NOTICE 'Dropped existing leagues_status_check constraint';
  END IF;
  
  ALTER TABLE leagues 
  ADD CONSTRAINT leagues_status_check 
    CHECK (status IN ('active', 'inactive', 'archived', 'registration'));
  RAISE NOTICE 'Added leagues_status_check constraint with standardized values';
END $$;

-- Verify changes
SELECT 'Verification of critical changes:' AS message;

-- Check payments table columns
SELECT 'Payments table columns:' AS message;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'payments'
ORDER BY ordinal_position;

-- Check tournaments table columns
SELECT 'Tournaments table columns:' AS message;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tournaments'
ORDER BY ordinal_position;

-- Check leagues table columns
SELECT 'Leagues table columns:' AS message;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'leagues'
ORDER BY ordinal_position;

-- Check constraints
SELECT 'Table constraints:' AS message;
SELECT tc.table_name, tc.constraint_name, tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('payments', 'tournaments', 'leagues', 'team_players', 'teams')
ORDER BY tc.table_name, tc.constraint_name;

-- Check indexes
SELECT 'Indexes:' AS message;
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname; 