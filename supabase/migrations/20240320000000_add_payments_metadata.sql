-- Create the set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- First add unique constraint to payments.payment_id if it doesn't exist
ALTER TABLE public.payments 
ADD CONSTRAINT payments_payment_id_key UNIQUE (payment_id);

-- Then create the metadata table with the foreign key
CREATE TABLE IF NOT EXISTS public.metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id TEXT NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_payment FOREIGN KEY (payment_id) REFERENCES public.payments(payment_id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payments_metadata_payment_id ON public.metadata(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_metadata_event_id ON public.metadata((metadata->>'eventId'));

-- Add RLS policies
ALTER TABLE public.metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment metadata"
    ON public.metadata FOR SELECT
    USING (
        payment_id IN (
            SELECT payment_id FROM public.payments WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own payment metadata"
    ON public.metadata FOR INSERT
    WITH CHECK (
        payment_id IN (
            SELECT payment_id FROM public.payments WHERE user_id = auth.uid()
        )
    );

-- Add trigger to update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.metadata
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at(); 