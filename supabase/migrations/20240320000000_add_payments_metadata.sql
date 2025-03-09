-- Create the payments.metadata table
CREATE TABLE IF NOT EXISTS payments.metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id TEXT NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payments_metadata_payment_id ON payments.metadata(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_metadata_event_id ON payments.metadata((metadata->>'eventId'));

-- Add RLS policies
ALTER TABLE payments.metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment metadata"
    ON payments.metadata FOR SELECT
    USING (
        payment_id IN (
            SELECT payment_id FROM payments WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own payment metadata"
    ON payments.metadata FOR INSERT
    WITH CHECK (
        payment_id IN (
            SELECT payment_id FROM payments WHERE user_id = auth.uid()
        )
    );

-- Add trigger to update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON payments.metadata
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at(); 