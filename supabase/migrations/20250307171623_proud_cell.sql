/*
  # Payment System Schema Update

  1. Changes
    - Add payment_status to tournament and league registrations
    - Add payment_amount to tournaments and leagues
    - Add payment-related policies and triggers

  2. Security
    - Enable RLS on payments table
    - Add policies for user and admin access
    - Ensure proper access controls for payment data

  3. Notes
    - All changes are safe and non-destructive
    - Includes proper error handling for existing objects
*/

-- Only create payments table if it doesn't exist
DO $$ BEGIN
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

    -- Enable RLS on payments
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

-- Add payment_status to tournament_registrations if it doesn't exist
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

-- Add payment_status to league_registrations if it doesn't exist
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

-- Add payment_amount to tournaments if it doesn't exist
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

-- Add payment_amount to leagues if it doesn't exist
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