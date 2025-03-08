/*
  # Add payment metadata table and functions

  1. New Tables
    - `payment_metadata`
      - `id` (uuid, primary key)
      - `payment_id` (text, unique)
      - `user_id` (uuid, references users)
      - `response_data` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on payment_metadata table
    - Add policies for admins and users to view their own payment metadata
*/

-- Create payment metadata table
CREATE TABLE IF NOT EXISTS payment_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  response_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on payment_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_metadata_payment_id ON payment_metadata(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_metadata_user_id ON payment_metadata(user_id);

-- Enable RLS
ALTER TABLE payment_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can read all payment metadata"
  ON payment_metadata
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.user_id = auth.uid()
      AND players.role = ANY(ARRAY['admin'::text, 'owner'::text])
    )
  );

CREATE POLICY "Users can view their own payment metadata"
  ON payment_metadata
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to validate payment metadata structure
CREATE OR REPLACE FUNCTION validate_payment_metadata()
RETURNS trigger AS $$
BEGIN
  IF NEW.response_data IS NOT NULL THEN
    -- Validate required fields
    IF NOT (
      NEW.response_data ? 'transaction_details' AND 
      NEW.response_data ? 'payment_method'
    ) THEN
      RAISE EXCEPTION 'Invalid metadata structure';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;