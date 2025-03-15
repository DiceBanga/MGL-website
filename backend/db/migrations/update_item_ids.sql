-- First, modify the existing constraint to accept 4 digits
ALTER TABLE items DROP CONSTRAINT IF EXISTS valid_item_id;
ALTER TABLE items ADD CONSTRAINT valid_item_id CHECK (item_id ~ '^[0-9]{4,5}$');

-- Then update the IDs to 4 digits
UPDATE items SET item_id = '1001' WHERE item_id = '10001';
UPDATE items SET item_id = '1002' WHERE item_id = '10002';
UPDATE items SET item_id = '1003' WHERE item_id = '10003';
UPDATE items SET item_id = '1004' WHERE item_id = '10004';
UPDATE items SET item_id = '1005' WHERE item_id = '10005';
UPDATE items SET item_id = '1006' WHERE item_id = '10006';
UPDATE items SET item_id = '1007' WHERE item_id = '10007';

-- Finally, tighten the constraint to only allow 4 digits
ALTER TABLE items DROP CONSTRAINT valid_item_id;
ALTER TABLE items ADD CONSTRAINT valid_item_id CHECK (item_id ~ '^[0-9]{4}$'); 