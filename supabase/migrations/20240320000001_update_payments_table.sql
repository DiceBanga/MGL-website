-- Add metadata column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create an index on the metadata column
CREATE INDEX IF NOT EXISTS idx_payments_metadata ON payments USING GIN (metadata);

-- Update RLS policies to include metadata
CREATE POLICY "Users can view their own payment metadata"
    ON payments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own payment metadata"
    ON payments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid()); 