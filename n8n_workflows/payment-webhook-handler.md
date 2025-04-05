# Payment Webhook Handler Workflow

## Purpose
This workflow processes webhooks from Square to update payment statuses and trigger follow-up actions for completed or failed payments.

## Trigger
- HTTP Webhook Endpoint exposed at `/api/payments/webhook`
- POST method with JSON payload from Square
- Signature verification header for security

## Input Schema
```json
{
  "merchant_id": "square-merchant-id",
  "type": "payment.updated",
  "event_id": "unique-event-id",
  "data": {
    "type": "payment",
    "id": "payment-id",
    "object": {
      "payment": {
        "id": "square-payment-id",
        "status": "COMPLETED|FAILED",
        "receipt_number": "receipt-number",
        "receipt_url": "https://square.com/receipt/...",
        // Other payment details...
      }
    }
  }
}
```

## Workflow Steps

### 1. Verify Webhook Signature
- **Node Type:** Function
- **Purpose:** Validate the webhook is genuine
- **Actions:**
  - Extract signature header from request
  - Compute expected signature using webhook signing key
  - Compare signatures
  - Reject if invalid

### 2. Extract Payment Data
- **Node Type:** Function
- **Purpose:** Extract relevant data from webhook
- **Actions:**
  - Parse webhook JSON payload
  - Extract payment ID, status, and other fields
  - Format data for processing

### 3. Retrieve Payment Record
- **Node Type:** Supabase
- **Purpose:** Get existing payment record
- **Actions:**
  - Query payments table for Square payment ID
  - Check if payment exists in database
  - Get associated request ID if available

### 4. Payment Status Router
- **Node Type:** Switch
- **Purpose:** Route based on payment status
- **Actions:**
  - Branch based on payment.status
  - Handle COMPLETED, FAILED, and other statuses differently

### 5. Process Completed Payment
- **Node Type:** Function (Branch)
- **Purpose:** Handle successful payment
- **Actions:**
  - Update payment status to "completed"
  - Extract receipt URL and other details
  - Prepare data for request update

### 6. Process Failed Payment
- **Node Type:** Function (Branch)
- **Purpose:** Handle failed payment
- **Actions:**
  - Update payment status to "failed"
  - Extract error information
  - Prepare data for request update

### 7. Update Payment Record
- **Node Type:** Supabase
- **Purpose:** Update payment in database
- **Actions:**
  - Update status, receipt URL, and metadata
  - Set updated_at timestamp
  - Store Square event ID to prevent duplicates

### 8. Retrieve Associated Request
- **Node Type:** Supabase
- **Purpose:** Get request associated with payment
- **Actions:**
  - Query team_change_requests table
  - Find request with matching payment ID
  - Extract request type and data

### 9. Request Type Router
- **Node Type:** Switch
- **Purpose:** Route based on request type
- **Actions:**
  - Branch based on request_type
  - Call appropriate sub-workflow for each type

### 10. Update Request Status
- **Node Type:** Supabase
- **Purpose:** Update request record status
- **Actions:**
  - For completed payments:
    - Set status to "processing" or "completed"
    - Add payment details to metadata
  - For failed payments:
    - Set status to "payment_failed"
    - Add error details to metadata

### 11. Execute Request Action (Completed Payments)
- **Node Type:** HTTP Request (or Sub-workflow)
- **Purpose:** Perform the requested action
- **Actions:**
  - For team_transfer: Execute transfer function
  - For tournament_registration: Complete registration
  - For other types: Execute appropriate action
  - Only runs for completed payments

### 12. Send Notifications
- **Node Type:** Sub-workflow
- **Purpose:** Notify relevant users
- **Actions:**
  - For completed payments:
    - Send success notification with receipt
    - Include next steps
  - For failed payments:
    - Send payment failure notification
    - Include retry instructions

### 13. Log Webhook Processing
- **Node Type:** Function
- **Purpose:** Create audit log
- **Actions:**
  - Log webhook processing details
  - Store request/response for troubleshooting
  - Track processing time

### 14. Return Response
- **Node Type:** Function
- **Purpose:** Send response to Square
- **Actions:**
  - Return 200 OK status
  - Include minimal processing confirmation
  - Square expects 2xx response within time limit

## Error Handling

### Signature Verification Error
- If signature validation fails:
  - Log potential security incident
  - Return 401 Unauthorized
  - Do not process the webhook

### Payment Not Found
- If payment doesn't exist in database:
  - Create new payment record with available data
  - Log warning about out-of-order webhook
  - Continue processing

### Request Not Found
- If no request is associated with payment:
  - Log error for manual review
  - Store payment data for reconciliation
  - Return 200 OK to acknowledge receipt

### Processing Error
- If action execution fails:
  - Log detailed error
  - Set request status to indicate partial processing
  - Trigger admin notification for manual intervention
  - Return 200 OK to avoid duplicate webhooks

## Database Operations

### Required Tables
- `payments` - To update payment status
- `team_change_requests` - To update request status
- `webhook_logs` - To log webhook processing

### SQL Operations
- Update payment status:
  ```sql
  UPDATE payments
  SET status = :status,
      receipt_url = :receipt_url,
      updated_at = now(),
      metadata = jsonb_set(metadata, '{square_event_id}', :event_id)
  WHERE payment_id = :payment_id
  ```

- Update request status:
  ```sql
  UPDATE team_change_requests
  SET status = :status,
      updated_at = now(),
      processed_at = CASE WHEN :status IN ('completed', 'processing') THEN now() ELSE processed_at END,
      metadata = jsonb_set(metadata, '{payment_result}', :payment_result)
  WHERE id = :request_id
  ```

- Log webhook:
  ```sql
  INSERT INTO webhook_logs (
    provider, event_type, event_id, payload, processing_time, status
  ) VALUES (
    'square', :event_type, :event_id, :payload, :processing_time, :status
  )
  ```

## Security Considerations

- **Signature Verification:** Ensure webhook comes from Square
- **Idempotency:** Handle duplicate webhooks gracefully
- **Timeout Handling:** Process within Square's timeout limit
- **Error Isolation:** Errors in one step shouldn't affect others
- **Sensitive Data Handling:** Secure payment information

## Integration Points

- Integrates with the payment-processor workflow
- Integrates with request-specific action workflows
- Integrates with user-notifications workflow

## Testing Strategy

- Mock webhooks for various payment scenarios
- Test signature verification with valid/invalid signatures
- Test idempotency with duplicate webhooks
- Test error scenarios and recovery
- Test with various request types

## Expected Output

For Successful Processing:
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "webhook_log_id": "uuid-of-log-entry"
}
```

For Error Conditions:
```json
{
  "success": false,
  "error": "Error description",
  "webhook_log_id": "uuid-of-log-entry"
}
``` 