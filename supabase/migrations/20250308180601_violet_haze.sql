/*
  # Payment Metadata Updates
  
  1. New Fields
    - Add metadata fields for payment processing details
    - Add indexes for improved query performance
    - Add validation checks for metadata structure
  
  2. Security
    - Add RLS policies for metadata access
    - Add validation triggers
*/

-- Add metadata validation check
ALTER TABLE public.payments 
ADD CONSTRAINT valid_metadata_structure 
CHECK (
  CASE 
    WHEN metadata IS NOT NULL THEN
      jsonb_typeof(metadata->'transaction_details') = 'object' AND
      jsonb_typeof(metadata->'payment_method') = 'object'
    ELSE true
  END
);

-- Add function to validate metadata structure
CREATE OR REPLACE FUNCTION validate_payment_metadata()
RETURNS trigger AS $$
BEGIN
  IF NEW.metadata IS NOT NULL THEN
    -- Ensure required fields exist
    IF NOT (
      NEW.metadata ? 'transaction_details' AND
      NEW.metadata ? 'payment_method'
    ) THEN
      RAISE EXCEPTION 'Invalid metadata structure: missing required fields';
    END IF;
    
    -- Validate transaction_details
    IF NOT (
      NEW.metadata->'transaction_details' ? 'processor_response' AND
      NEW.metadata->'transaction_details' ? 'authorization_code'
    ) THEN
      RAISE EXCEPTION 'Invalid transaction_details structure';
    END IF;
    
    -- Validate payment_method
    IF NOT (
      NEW.metadata->'payment_method' ? 'type' AND
      NEW.metadata->'payment_method' ? 'last_four'
    ) THEN
      RAISE EXCEPTION 'Invalid payment_method structure';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metadata validation
CREATE TRIGGER validate_payment_metadata_trigger
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_metadata();

-- Add indexes for common metadata queries
CREATE INDEX idx_payments_metadata_transaction_id ON public.payments ((metadata->>'transaction_id'));
CREATE INDEX idx_payments_metadata_status ON public.payments ((metadata->>'status'));

-- Add RLS policies for metadata access
CREATE POLICY "Users can view their own payment metadata"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payment metadata"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.user_id = auth.uid()
      AND players.role IN ('admin', 'owner')
    )
  );

-- Add helper function to extract metadata fields
CREATE OR REPLACE FUNCTION get_payment_metadata(payment_row payments)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'transaction_id', payment_row.metadata->'transaction_details'->>'transaction_id',
    'processor_response', payment_row.metadata->'transaction_details'->>'processor_response',
    'authorization_code', payment_row.metadata->'transaction_details'->>'authorization_code',
    'payment_method', payment_row.metadata->'payment_method'->>'type',
    'last_four', payment_row.metadata->'payment_method'->>'last_four',
    'status', payment_row.status,
    'created_at', payment_row.created_at
  );
END;
$$ LANGUAGE plpgsql;