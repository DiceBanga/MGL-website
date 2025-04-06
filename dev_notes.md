# Developer Notes: Payment & Request Handling System

This document outlines the architecture and flow of the payment processing, request handling, and webhook systems in the MGL platform, with the team transfer process as the reference implementation.

## System Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Payment   │────▶│   Request   │────▶│  Database   │
│   (React)   │◀────│   Service   │◀────│   Service   │◀────│ (Supabase)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                       ▲
                           │                                       │
                           ▼                                       │
                    ┌─────────────┐                        ┌─────────────┐
                    │   Square    │                        │   Webhook   │
                    │  Payment    │────────────────────────▶   Handler   │
                    │  Gateway    │                        │             │
                    └─────────────┘                        └─────────────┘
```

## 1. Payment Service

### Purpose:

Handles payment processing for all monetized actions including team transfers, tournament registrations, and roster changes.

### Implementation:

- Located in: `frontend/src/services/PaymentService.ts`
- Core methods:
  - `processSquarePayment`: Processes payments through Square
  - `createPendingPaymentRecord`: Creates initial payment record in database
  - `recordPaymentInDatabase`: Updates payment record after successful payment

### Payment Flow:

1. User initiates action that requires payment
2. `createPaymentDetails` utility creates payment object with proper metadata
3. Payment details include:
   - Action-specific data (e.g., team ID, player ID)
   - Reference ID (format: `itemId-requestUUID`)
   - Metadata with information for creating change request
4. Create pending payment record in database
5. Process payment through Square integration
6. Update payment record with success/failure information

### Metadata Structure:

```javascript
{
  "transaction_details": {
    "processor_response": "...",
    "authorization_code": "..."
  },
  "payment_method": {
    "type": "square",
    "last_four": "0000"
  },
  "team_id": "a59c214f-e020-46c2-9fa5-6648f0f5a841",
  "event_type": "team_transfer",
  "request_id": "90354d17-3868-4761-bcc8-9a14078d699a",
  "custom_data": {
    // Action-specific data
    "oldCaptainName": "owner@militagamingleague.com",
    "newCaptainName": "Dice",
    "teamName": "ChickyPoos",
    "requestId": "90354d17-3868-4761-bcc8-9a14078d699a"
  }
}
```

## Item IDs for Payment Reference

| Item Name               | item_id |
| ----------------------- | ------- |
| League Registration     | 1004    |
| Tournament Registration | 1003    |
| Team Transfer           | 1002    |
| Team Creation           | 1001    |
| Roster Change           | 1005    |
| Team Rebrand            | 1006    |
| Online ID Change        | 1007    |

Use these `item_id` values in the `reference_id` generation for payment requests.

## Reference ID Format

The `reference_id` sent to Square **must** be:

```
{item_id}-{request_id with hyphens removed}
```

Example:

```
1003-b8f7d0f2edca44c3bd1fb0a5765b3a2c
```

- The `item_id` is the **numeric string** from the `items` table (e.g., `'1003'` for Tournament Registration).
- The `request_id` is a UUID with hyphens removed (32 characters).
- Total length is about 37 characters, compliant with Square's 40-character limit.

This format is used for **all payment types** to ensure consistency and avoid Square API errors.

## 2. Request Service

### Purpose:

Manages requests for actions that require approval, validation, or payment, including team transfers, league registrations, and tournament registrations.

### Implementation:

- Core tables:
  - `team_change_requests`: Stores requests for team-related changes
  - Other request tables for specific actions
- Key components:
  - `createTeamChangeRequest`: Creates request records
  - `handle_request_status_update`: Database trigger function that executes actions

### Request Flow:

1. User initiates action through UI
2. System creates payment details (if applicable)
3. After successful payment, system creates request with status 'processing'
4. Database trigger activates on status change to 'processing'
5. Trigger function executes the appropriate action based on request type
6. Request status updated to 'completed' or 'failed' based on execution result

### Status Lifecycle:

- `pending`: Initial state, waiting for payment or approval
- `processing`: Payment completed, request is being executed
- `completed`: Request successfully executed
- `failed`: Request execution failed
- `rejected`: Request was rejected by administrator

### Request Creation (Team Transfer Example):

```javascript
const { data, error } = await supabase
  .from("team_change_requests")
  .insert({
    id: requestId,
    team_id: teamId,
    request_type: "team_transfer",
    requested_by: requestedBy,
    player_id: playerId,
    old_value: oldValue,
    new_value: newValue,
    status: "processing", // Important: Set to 'processing' to trigger immediate execution
    payment_reference: paymentId,
    item_id: formattedItemId,
    metadata: cleanMetadata,
  })
  .select()
  .single();
```

## 3. Webhook Service

### Purpose:

Handles asynchronous payment notifications from Square and updates request statuses accordingly.

### Implementation:

- Located in: `backend/routes/webhooks.py` and database trigger functions
- Core methods:
  - `handle_square_webhook`: Processes webhook notifications from Square
  - `process_request_update`: Updates request status based on payment status

### Webhook Flow:

1. Square sends webhook notification when payment status changes
2. Webhook handler extracts payment ID and determines associated request
3. Updates request status based on payment outcome
4. For successful payments, sets request status to 'processing'
5. Database trigger executes the appropriate action based on request type

### Database Trigger Implementation:

```sql
CREATE OR REPLACE FUNCTION public.handle_request_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  new_captain_id uuid;
  old_captain_id uuid;
begin
  -- Only handle team transfers in 'processing' state
  IF NEW.request_type = 'team_transfer' AND NEW.status = 'processing' THEN
    -- Get the captain IDs
    SELECT id INTO old_captain_id
    FROM auth.users
    WHERE email = NEW.metadata->>'oldCaptainName';

    SELECT user_id INTO new_captain_id
    FROM public.players
    WHERE display_name = NEW.metadata->>'newCaptainName';

    -- Call the transfer function directly
    PERFORM admin_transfer_team_ownership(
      NEW.team_id,
      new_captain_id,
      old_captain_id
    );

    -- Update request status to completed
    UPDATE team_change_requests
    SET
      status = 'completed',
      processed_at = NOW(),
      updated_at = NOW(),
      metadata = jsonb_set(
        metadata,
        '{action_result}',
        jsonb_build_object(
          'success', true,
          'message', 'Team ownership transferred successfully',
          'team_id', NEW.team_id,
          'old_captain_id', old_captain_id,
          'new_captain_id', new_captain_id
        )
      )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;
```

## 4. Implementation Guidelines for Consistency

### For New Request Types:

1. **UI Component Structure**:

   - Use `TeamActionProcessor` component as a template for action flows
   - Implement two-step confirmation for all paid actions
   - Display clear feedback on action status

2. **Payment Details Creation**:

   - Use the `createPaymentDetails` utility function
   - Include all necessary metadata for request creation
   - Follow standard reference ID format: `itemId-requestUUID`

3. **Request Creation**:

   - Set status to 'processing' immediately after successful payment
   - Include complete metadata needed for action execution
   - Use consistent field naming across different request types

4. **Database Trigger Implementation**:
   - Add specific handling for each request type
   - Include comprehensive error handling
   - Update request with detailed result information

### Tournament Registration Implementation:

```javascript
// Example implementation for tournament registration
const paymentDetails = createPaymentDetails(
  "tournament_registration",
  "Tournament Registration",
  registrationFee,
  `Register ${team.name} for ${tournament.name}`,
  {
    teamId: team.id,
    captainId: user.id,
    item_id: itemId,
    request_id: requestId,
    tournamentId: tournament.id,
    playersIds: selectedPlayers,
  }
);

// Add metadata for the tournament registration request
paymentDetails.metadata = {
  requestType: "tournament_registration",
  tournamentId: tournament.id,
  tournamentName: tournament.name,
  teamId: team.id,
  teamName: team.name,
  requestId: requestId,
  playerIds: selectedPlayers,
  changeRequestData: {
    teamId: team.id,
    requestedBy: user.id,
    itemId: itemId,
    tournamentId: tournament.id,
    oldValue: "",
    newValue: tournament.id,
    requestId: requestId,
    metadata: {
      tournamentName: tournament.name,
      teamName: team.name,
      playerIds: selectedPlayers,
      requestId: requestId,
    },
  },
};
```

## 5. Debugging and Troubleshooting

### Common Issues:

1. **Payment Processing Errors**:

   - Check payment metadata structure
   - Verify Square API keys and environment settings
   - Examine webhook logs for payment status

2. **Request Execution Failures**:

   - Check database triggers are correctly registered
   - Verify metadata contains required fields
   - Look for error messages in request.last_error field

3. **Missing Request IDs**:
   - Ensure payment references and request IDs match
   - Verify reference ID format is consistent
   - Check if payment record was successfully created

### Logging Best Practices:

- Log detailed information at each step of the process
- Include request IDs in all log messages for traceability
- Log payments with sensitive data redacted
- Log both successful and failed operations

## 6. Testing the Payment & Request Flow

1. **Unit Testing**:

   - Mock Square payment responses
   - Test request creation with various metadata formats
   - Verify trigger functions with simulated status changes

2. **Integration Testing**:

   - Test full payment flow with Square sandbox
   - Verify webhook handling with simulated notifications
   - Test database triggers with real data

3. **Manual Testing Checklist**:
   - Successful payment completes request
   - Failed payment correctly updates request status
   - Request execution properly updates status
   - Error states are properly handled and displayed
   - Payments can be reconciled with requests

## 7. CI/CD Considerations

- Run unit tests on every PR
- Test database migrations in staging environment
- Validate webhook handling in isolated test environment
- Version payment and request schemas for backward compatibility
- Test payment flows with Square sandbox in CI pipeline
- Monitor payment success rates and request completion rates
