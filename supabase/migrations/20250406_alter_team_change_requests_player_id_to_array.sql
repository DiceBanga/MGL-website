-- Migration: Drop FK constraint and alter player_id column to uuid[] array in team_change_requests

ALTER TABLE team_change_requests
DROP CONSTRAINT IF EXISTS team_change_requests_player_id_fkey;

ALTER TABLE team_change_requests
ALTER COLUMN player_id TYPE uuid[] USING ARRAY[player_id];