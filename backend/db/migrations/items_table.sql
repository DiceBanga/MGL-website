-- Create items table
CREATE TABLE items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    item_id CHAR(5) NOT NULL UNIQUE,
    item_description TEXT,
    reg_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Add constraints
    CONSTRAINT valid_item_id CHECK (item_id ~ '^[0-9]{5}$'),
    CONSTRAINT positive_prices CHECK (reg_price >= 0 AND current_price >= 0)
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial items
INSERT INTO items (item_name, item_id, item_description, reg_price, current_price, metadata)
VALUES 
    ('Team Creation', '10001', 'Create a new team', 25.00, 25.00, '{"type": "team_management"}'::jsonb),
    ('Team Transfer', '10002', 'Transfer team ownership to another player', 15.00, 15.00, '{"type": "team_management"}'::jsonb),
    ('Tournament Registration', '10003', 'Register team for a tournament', 50.00, 50.00, '{"type": "registration"}'::jsonb),
    ('League Registration', '10004', 'Register team for a league season', 100.00, 100.00, '{"type": "registration"}'::jsonb),
    ('Roster Change', '10005', 'Make changes to team roster outside of transfer window', 10.00, 10.00, '{"type": "team_management"}'::jsonb),
    ('Team Rebrand', '10006', 'Change team name and branding', 20.00, 20.00, '{"type": "team_management"}'::jsonb),
    ('Gamer Tag Change', '10007', 'Change player gamer tag', 5.00, 5.00, '{"type": "player_management"}'::jsonb);

-- Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policies
-- 1. Allow all authenticated users to view items
CREATE POLICY "Allow users to view items"
    ON items
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Allow owners to manage all items
CREATE POLICY "Allow owners to manage items"
    ON items
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'owner'
        )
    );

-- 3. Allow admins to create and update items
CREATE POLICY "Allow admins to create items"
    ON items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Allow admins to update items"
    ON items
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

-- Function to automatically set created_by and updated_by
CREATE OR REPLACE FUNCTION set_item_user_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        NEW.created_by = auth.uid();
    END IF;
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user fields
CREATE TRIGGER set_item_user_fields_trigger
    BEFORE INSERT OR UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION set_item_user_fields(); 