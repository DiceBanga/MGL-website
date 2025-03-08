/*
  # Payment System Integration
  
  1. New Tables
    - `payments` table for tracking all payment transactions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `amount` (numeric)
      - `currency` (text)
      - `payment_method` (text)
      - `status` (text)
      - `description` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes
    - Add payment_status to tournament_registrations and league_registrations
    - Add payment_amount to tournaments and leagues
  
  3. Security
    - Enable RLS on payments table
    - Add policies for users and admins
*/

DO $$ BEGIN
  -- Only create payments table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payments') THEN
    CREATE TABLE payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      amount numeric NOT NULL,
      currency text NOT NULL DEFAULT 'USD',
      payment_method text NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
      description text,
      metadata jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

    -- Create trigger for updated_at
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    -- Create policies for payments
    CREATE POLICY "Users can view their own payments"
      ON payments FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Users can create their own payments"
      ON payments FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "Admins can view all payments"
      ON payments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM players
          WHERE user_id = auth.uid()
          AND role = 'admin'
        )
      );

    CREATE POLICY "Admins can manage all payments"
      ON payments FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM players
          WHERE user_id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Add payment_status to tournament_registrations if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournament_registrations' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE tournament_registrations 
    ADD COLUMN payment_status text DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;
END $$;

-- Add payment_status to league_registrations if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'league_registrations' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE league_registrations 
    ADD COLUMN payment_status text DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;
END $$;

-- Add payment_amount to tournaments if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' 
    AND column_name = 'payment_amount'
  ) THEN
    ALTER TABLE tournaments
    ADD COLUMN payment_amount numeric DEFAULT 50.00;
  END IF;
END $$;

-- Add payment_amount to leagues if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leagues' 
    AND column_name = 'payment_amount'
  ) THEN
    ALTER TABLE leagues
    ADD COLUMN payment_amount numeric DEFAULT 100.00;
  END IF;
END $$;