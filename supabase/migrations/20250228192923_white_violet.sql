/*
  # Add payments table and related fields

  1. New Tables
    - `payments` - Stores payment records for tournament and league registrations
  
  2. Changes
    - Add payment_status field to tournament_registrations and league_registrations tables
    - Add payment_amount field to tournaments and leagues tables
  
  3. Security
    - Enable RLS on payments table
    - Add policies for payment management
*/

-- Create payments table
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

-- Add payment_status to tournament_registrations
ALTER TABLE tournament_registrations 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Add payment_status to league_registrations
ALTER TABLE league_registrations 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending'
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Add payment_amount to tournaments
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT 50.00;

-- Add payment_amount to leagues
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT 100.00;

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