/*
  # Update payment metadata policies

  1. Changes
    - Add policy for users to view their own payment metadata
    - Add policy for admins to view all payment metadata
    - Add policy for system to insert payment metadata

  2. Security
    - Enable RLS on payment_metadata table
    - Restrict users to only view their own payment data
    - Allow admins to view all payment data
    - Allow system to insert new payment records
*/

-- Enable RLS
ALTER TABLE payment_metadata ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own payment metadata" ON payment_metadata;
DROP POLICY IF EXISTS "Admins can view all payment metadata" ON payment_metadata;
DROP POLICY IF EXISTS "System can insert payment metadata" ON payment_metadata;

-- Create new policies
CREATE POLICY "Users can view their own payment metadata"
ON payment_metadata
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payment metadata"
ON payment_metadata
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM players
  WHERE players.user_id = auth.uid()
  AND players.role IN ('admin', 'owner')
));

CREATE POLICY "System can insert payment metadata"
ON payment_metadata
FOR INSERT
TO authenticated
WITH CHECK (true);