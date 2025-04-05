# Request Processor Workflow

## Purpose
This workflow serves as the central entry point for all request types in the MGL platform. It validates, processes, and tracks requests through their lifecycle.

## Trigger
- HTTP Endpoint exposed at `/api/requests`
- POST method with JSON payload

## Input Schema
```json
{
  "request_id": "optional-uuid-will-be-generated-if-missing",
  "request_type": "team_transfer|roster_change|tournament_registration|league_registration|team_rebrand|online_id_change|team_creation",
  "team_id": "uuid-of-team",
  "requested_by": "uuid-of-requesting-user",
  "requires_payment": true|false,
  "metadata": {
    // Request-specific data...
  }
}
```

## Workflow Steps

### 1. Request Validation
- **Node Type:** Function
- **Purpose:** Validate request data
- **Actions:**
  - Check for required fields based on request type
  - Validate that requesting user has permissions
  - Generate a request_id if not provided
  - Return validation errors if any

### 2. Create Request Record
- **Node Type:** Supabase
- **Purpose:** Store initial request record
- **Actions:**
  - Insert a new record in team_change_requests table
  - Set initial status to "pending"
  - Store metadata and request-specific fields

### 3. Request Type Router
- **Node Type:** Switch
- **Purpose:** Route to type-specific processing
- **Actions:**
  - Branch based on request_type field
  - Each branch connects to a specific sub-workflow

### 4. Payment Check
- **Node Type:** IF
- **Purpose:** Determine if payment is required
- **Actions:**
  - Check requires_payment field
  - If true, route to payment processing
  - If false, continue to action execution

### 5. Payment Processing
- **Node Type:** Webhook-Wait 
- **Purpose:** Wait for payment completion
- **Actions:**
  - Create a Square payment record
  - Update request status to "awaiting_payment"
  - Generate a payment URL
  - Return payment URL to the client
  - Wait for webhook callback to continue

### 6. Action Execution
- **Node Type:** HTTP Request (or Sub-workflow)
- **Purpose:** Execute the requested action
- **Actions:**
  - Call corresponding sub-workflow based on request type
  - Pass all request data and payment result if applicable
  - Wait for completion

### 7. Update Request Status
- **Node Type:** Supabase
- **Purpose:** Update request record status
- **Actions:**
  - Update status to "completed" or "failed"
  - Store result data in metadata
  - Update timestamps

### 8. Error Handling
- **Node Type:** Error Trigger
- **Purpose:** Handle any errors in the workflow
- **Actions:**
  - Capture error details
  - Update request status to "failed"
  - Store error details in metadata
  - Send error notification if configured

### 9. Response Formatting
- **Node Type:** Function
- **Purpose:** Format response for client
- **Actions:**
  - Create standardized response object
  - Include request status, ID, and next steps
  - Return formatted response

## Sub-workflow Integration

The main workflow integrates with these specialized sub-workflows:

1. **team-transfer.json** - When request_type is "team_transfer"
2. **roster-change.json** - When request_type is "roster_change"
3. **tournament-registration.json** - When request_type is "tournament_registration"
4. **league-registration.json** - When request_type is "league_registration"
5. **team-rebrand.json** - When request_type is "team_rebrand"
6. **online-id-change.json** - When request_type is "online_id_change"
7. **team-creation.json** - When request_type is "team_creation"

## Webhook Integration

Two webhook endpoints are exposed:

1. **/api/requests/{request_id}/status** - To poll request status
2. **/api/payments/webhook** - For payment service callbacks

## Environment Variables Required

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service key for admin access
- `SQUARE_ACCESS_TOKEN` - Square API access token
- `SQUARE_LOCATION_ID` - Square location ID
- `SQUARE_ENVIRONMENT` - sandbox/production

## Error Strategy

1. **Retry Logic:** Configured for external service calls (3 retries with exponential backoff)
2. **Compensation Actions:** Reverses partial actions on failure
3. **Error Notification:** Sends alerts for system errors
4. **User Feedback:** Returns clear error messages to frontend 