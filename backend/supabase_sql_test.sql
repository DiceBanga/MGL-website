-- SQL script to test inserting a payment record directly in Supabase SQL Editor
-- This bypasses Row Level Security (RLS) policies

-- Check the current structure of the payments table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

-- Check for any existing payments (limit to 5)
SELECT * FROM payments LIMIT 5;

-- Check for table constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass;

-- Check for triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'payments';

-- Test 1: Insert with minimal metadata
INSERT INTO payments (
  user_id,
  amount,
  currency,
  status,
  payment_method,
  payment_id,
  description,
  metadata
)
VALUES (
  'ecac78cd-e1a9-484a-a55e-4da6aa6c103a',  -- user_id
  150.00,                                  -- amount
  'USD',                                   -- currency
  'COMPLETED',                             -- status
  'square',                                -- payment_method
  'TEST-PAYMENT-ID-001',                   -- payment_id
  'Test payment from SQL - minimal',       -- description
  '{                                       -- metadata as JSONB
    "provider": "square",
    "test": true
  }'::jsonb
)
RETURNING *;

-- Test 2: Try with NULL metadata (if allowed)
INSERT INTO payments (
  user_id,
  amount,
  currency,
  status,
  payment_method,
  payment_id,
  description,
  metadata
)
VALUES (
  'ecac78cd-e1a9-484a-a55e-4da6aa6c103a',  -- user_id
  150.00,                                  -- amount
  'USD',                                   -- currency
  'COMPLETED',                             -- status
  'square',                                -- payment_method
  'TEST-PAYMENT-ID-002',                   -- payment_id
  'Test payment from SQL - null metadata', -- description
  NULL                                      -- metadata as NULL
)
RETURNING *;

-- Test 3: Complex metadata structure
INSERT INTO payments (
  user_id,
  amount,
  currency,
  status,
  payment_method,
  payment_id,
  description,
  metadata
)
VALUES (
  'ecac78cd-e1a9-484a-a55e-4da6aa6c103a',  -- user_id
  150.00,                                  -- amount
  'USD',                                   -- currency
  'COMPLETED',                             -- status
  'square',                                -- payment_method
  'TEST-PAYMENT-ID-003',                   -- payment_id
  'Test payment from SQL - complex',       -- description
  '{                                       -- metadata as JSONB
    "provider": "square",
    "event_type": "league",
    "event_id": "test-league-id",
    "team_id": "test-team-id",
    "client": "web",
    "type": "payment",
    "version": "1.0",
    "transaction_type": "purchase",
    "transaction_id": "test-transaction-123",
    "receipt_number": "REC12345",
    "payment_details": {
      "method": "square",
      "card_type": "test",
      "last_4": "1111"
    },
    "billing_address": {
      "postal_code": "12345"
    }
  }'::jsonb
)
RETURNING *;

-- Test 4: Same complex metadata wrapped with square_payment key
INSERT INTO payments (
  user_id,
  amount,
  currency,
  status,
  payment_method,
  payment_id,
  description,
  metadata
)
VALUES (
  'ecac78cd-e1a9-484a-a55e-4da6aa6c103a',  -- user_id
  150.00,                                  -- amount
  'USD',                                   -- currency
  'COMPLETED',                             -- status
  'square',                                -- payment_method
  'TEST-PAYMENT-ID-004',                   -- payment_id
  'Test payment - wrapped metadata',       -- description
  '{                                       -- metadata as JSONB
    "square_payment": {
      "id": "mock_payment_123",
      "status": "COMPLETED",
      "amount_money": {
        "amount": 15000,
        "currency": "USD"
      },
      "source_id": "cnon:card-nonce-ok",
      "location_id": "test-location"
    }
  }'::jsonb
)
RETURNING *;

-- Verify which records were inserted successfully
SELECT payment_id, status, metadata 
FROM payments 
WHERE payment_id LIKE 'TEST-PAYMENT-ID-%' 
ORDER BY payment_id; 