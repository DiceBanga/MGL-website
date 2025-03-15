-- Drop existing table
DROP TABLE IF EXISTS items;

-- Recreate table with 4-digit constraint
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_description TEXT,
    reg_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    metadata JSONB,
    CONSTRAINT valid_item_id CHECK (item_id ~ '^[0-9]{4}$')
);

-- Insert items with 4-digit IDs
INSERT INTO "public"."items" ("id", "item_name", "item_id", "item_description", "reg_price", "current_price", "created_at", "created_by", "updated_at", "updated_by", "metadata") VALUES 
('f428f4c4-3741-449e-859b-42c71bc4a98f', 'Team Creation', '1001', 'Create a new team', '25.00', '25.00', '2025-03-15 19:09:35.373316+00', null, '2025-03-15 19:09:35.373316+00', null, '{"type":"team_management"}'),
('bd10f82f-170b-4639-a399-c4e99ec5b72b', 'Team Transfer', '1002', 'Transfer team ownership to another player', '15.00', '15.00', '2025-03-15 19:09:35.373316+00', null, '2025-03-15 19:09:35.373316+00', null, '{"type":"team_management"}'),
('660e8a39-dece-4a87-9ffe-5418d89a1b43', 'Tournament Registration', '1003', 'Register team for a tournament', '50.00', '50.00', '2025-03-15 19:09:35.373316+00', null, '2025-03-15 19:09:35.373316+00', null, '{"type":"registration"}'),
('920e28d4-ac3e-4918-97cd-663e46e4ab32', 'League Registration', '1004', 'Register team for a league season', '100.00', '100.00', '2025-03-15 19:09:35.373316+00', null, '2025-03-15 19:09:35.373316+00', null, '{"type":"registration"}'),
('28d192d5-7e0f-4d04-84ac-6ed926ed3532', 'Roster Change', '1005', 'Make changes to team roster outside of transfer window', '10.00', '10.00', '2025-03-15 19:09:35.373316+00', null, '2025-03-15 19:09:35.373316+00', null, '{"type":"team_management"}'),
('2f151e9f-7b81-4104-a842-32c9ead204ad', 'Team Rebrand', '1006', 'Change team name and branding', '20.00', '20.00', '2025-03-15 19:09:35.373316+00', null, '2025-03-15 19:09:35.373316+00', null, '{"type":"team_management"}'),
('d91ddc6e-0362-4ad6-bcc4-2c64bdd655fc', 'Gamer Tag Change', '1007', 'Change player gamer tag', '5.00', '5.00', '2025-03-15 19:09:35.373316+00', null, '2025-03-15 19:09:35.373316+00', null, '{"type":"player_management"}'); 