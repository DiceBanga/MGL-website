# Payment Processor Workflow

## Purpose
This workflow handles payment creation, processing, and storage for all payment-requiring actions in the MGL platform. It integrates with Square for payment processing and stores payment records in the Supabase database.

## Trigger
- Called as a sub-workflow from any request workflow requiring payment
- HTTP Endpoint also available at `/api/payments` for direct API access

## Input Requirements
```json
{
  "request_id": "uuid-of-request",
  "amount": 20.00,
  "currency": "USD",
  "source_id": "credit-card-nonce",
  "idempotency_key": "uuid-for-payment-idempotency",
  "note": "Payment for team transfer",
  "reference_id": "uuid-reference-usually-request-id",
  "metadata": {
    "transaction_details": {
      // Details about the transaction
    },
    "payment_method": {
      // Payment method details
    },
    "team_id": "uuid-of-team",
    "event_type": "team_transfer|tournament_registration|etc",
    "event_id": "uuid-of-event-if-applicable"
  }
}
```

## Workflow Steps

### 1. Validate Payment Data
- **Node Type:** Function
- **Purpose:** Validate payment request data
- **Actions:**
  - Check for required fields (amount, source_id)
  - Generate idempotency_key if not provided
  - Validate amount is positive
  - Return validation errors if any

### 2. Format Square Request
- **Node Type:** Function
- **Purpose:** Prepare data for Square API
- **Actions:**
  - Convert amount to cents (integer)
  - Format request body according to Square API specs
  - Add reference data and idempotency key

### 3. Process Square Payment
- **Node Type:** HTTP Request
- **Purpose:** Call Square API to process payment
- **Actions:**
  - Send payment request to Square API
  - Include authentication headers
  - Handle API response
  - Parse payment result

### 4. Format Payment Record
- **Node Type:** Function
- **Purpose:** Prepare data for database storage
- **Actions:**
  - Extract relevant payment details
  - Format metadata with required structure
  - Create database record object

### 5. Store Payment Record
- **Node Type:** Supabase
- **Purpose:** Store payment in database
- **Actions:**
  - Insert payment record in payments table
  - Handle database errors
  - Return inserted record ID

### 6. Update Request Status
- **Node Type:** Supabase
- **Purpose:** Update the related request
- **Actions:**
  - Update request status based on payment result
  - Add payment details to request metadata
  - Set payment_id on request record

### 7. Payment Receipt
- **Node Type:** Function
- **Purpose:** Generate payment receipt info
- **Actions:**
  - Format receipt information
  - Include payment details and links
  - Prepare email content if needed

### 8. Return Response
- **Node Type:** Function
- **Purpose:** Format final response
- **Actions:**
  - Create standardized response object
  - Include payment status, ID, and receipt URL
  - Return formatted response

## Error Handling

### Validation Errors
- If input validation fails:
  - Return detailed validation errors
  - Do not attempt payment processing

### Square API Errors
- If Square API returns an error:
  - Parse error details from Square response
  - Map to user-friendly error messages
  - Store error details in database
  - Return structured error response

### Database Errors
- If database storage fails:
  - Log payment details for manual reconciliation
  - Send alert to administrators
  - Return error but indicate payment might have succeeded

## Database Schema

### Payment Record Structure
```sql
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  status text NOT NULL,
  payment_method text NOT NULL,
  payment_id text UNIQUE,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Metadata Structure
```json
{
  "transaction_details": {
    "processor_response": "string",
    "authorization_code": "string"
  },
  "payment_method": {
    "type": "string",
    "last_four": "string"
  },
  "square_payment_id": "string",
  "event_type": "string",
  "event_id": "string",
  "team_id": "string",
  "request_id": "string"
}
```

## Integration Points

### External Services
- Square Payments API for payment processing

### Internal Workflows
- Integrates with the main request-processor workflow
- Integrates with all request type workflows that require payment

### Webhooks
- Creates a webhook URL for Square payment callbacks
- Handles payment status updates via Square webhooks

## Security Considerations

- Square API keys stored in environment variables
- Payment data never logged in plain text
- Sensitive fields masked in logs
- Idempotency keys used to prevent duplicate payments
- Supabase RLS policies to restrict payment record access
- Payment webhook verification to prevent spoofing

## Expected Output

### Success Response
```json
{
  "success": true,
  "payment_id": "square-payment-id",
  "status": "COMPLETED",
  "amount": 20.00,
  "currency": "USD",
  "receipt_url": "https://square.com/receipt/...",
  "created_at": "ISO8601-timestamp"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "error_code",
    "message": "User-friendly error message",
    "details": "Detailed error information"
  }
}
``` 