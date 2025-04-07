# Developer Notes: Payment & Request Handling System

This document outlines the architecture and flow of the payment processing, request handling, and webhook systems in the MGL platform, referencing recent updates for league and tournament registrations.

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

Handles payment processing for all monetized actions including team transfers, league/tournament registrations, roster changes, etc.

### Implementation:

- Located in: `frontend/src/services/PaymentService.ts`
- Core methods:
  - `processSquarePayment`: Processes payments through Square.
  - `createPendingPaymentRecord`: Creates initial payment record in database.
  - `recordPaymentInDatabase`: Updates payment record after successful payment.
- Utilities:
  - `createPaymentDetails` (`frontend/src/utils/paymentUtils.ts`): Creates standardized payment object.
  - `generateReferenceId` (`frontend/src/utils/paymentUtils.ts`): Generates Square-compliant reference IDs.

### Payment Flow:

1. User initiates action requiring payment (e.g., League Registration).
2. Frontend fetches necessary data (e.g., league details, item price, 4-digit `item_id`).
3. `createPaymentDetails` utility creates `PaymentDetails` object.
4. Payment details include:
   - Action-specific data (e.g., `teamId`, `eventId`, `playerIds` array).
   - `changeRequestType` (e.g., `'league_registration'`).
   - `referenceId` (format: `item_id-requestUUID`, see below).
   - `metadata` containing `changeRequestData` needed for creating the `team_change_requests` record.
5. Frontend navigates to `/payments` page with `PaymentDetails` in state.
6. `Payments.tsx` handles payment method selection (Square/CashApp).
7. For Square:
   - `PaymentForm` tokenizes card details.
   - `handleSquarePayment` triggers confirmation.
   - `confirmSquarePayment` calls `PaymentService.processSquarePayment`.
8. `PaymentService.processSquarePayment`:
   - Creates pending payment record in `payments` table.
   - Calls backend `/api/payments` endpoint to process payment with Square.
   - Updates payment record status.
   - **Crucially, calls `createTeamChangeRequest`** (in `Payments.tsx`) upon successful payment, passing the `paymentId` and original `paymentDetails`.
9. `createTeamChangeRequest` inserts a record into `team_change_requests` with status `'processing'`.
10. Database trigger `handle_request_status_update` executes the action (e.g., updates registration status, transfers team).

### Metadata Structure (Example: League Registration):

```javascript
// Passed in state to /payments
const paymentDetails: PaymentDetails = {
  id: "paymentUUID", // Generated UUID for payment
  type: "league", // General type
  changeRequestType: "league_registration", // Specific type for change request
  name: "League Registration for We Da Best",
  amount: 100,
  description: "Team: ChickyPoos, Event: We Da Best",
  teamId: "teamUUID",
  eventId: "leagueUUID", // League ID
  captainId: "captainUUID",
  playersIds: ["player1UUID", "player2UUID", ...], // Array of selected players
  request_id: "requestUUID", // Pre-generated UUID for the request
  referenceId: "1004-requestUUIDNoHyphens", // Square reference ID
  item_id: "1004", // 4-digit item code
  metadata: {
    requestType: "league_registration", // Redundant but kept for potential use
    eventName: "We Da Best",
    teamName: "ChickyPoos",
    playerIds: ["player1UUID", "player2UUID", ...],
    season: 1, // Actual season number for leagues
    requestId: "requestUUID",
    teamId: "teamUUID",
    leagueId: "leagueUUID",
    changeRequestData: { // Data needed to create the team_change_requests record
      teamId: "teamUUID",
      requestedBy: "captainUUID",
      itemId: "1004", // 4-digit item code
      leagueId: "leagueUUID",
      oldValue: "", // Or relevant old value for other request types
      newValue: "leagueUUID", // Or relevant new value
      requestId: "requestUUID",
      playerId: ["player1UUID", "player2UUID", ...], // Array of player UUIDs
      metadata: { // Nested metadata for the change request itself
        eventName: "We Da Best",
        teamName: "ChickyPoos",
        playerIds: ["player1UUID", "player2UUID", ...],
        requestId: "requestUUID",
        season: 1
      }
    }
  }
};
```

_Note: For Tournament Registration, `type` is `"tournament"`, `changeRequestType` is `"tournament_registration"`, `eventId` is the `tournamentId`, and `season` defaults to `0`._

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

Use these **4-digit string `item_id`** values in the `reference_id` generation.

## Reference ID Format

The `reference_id` sent to Square **must** be:

```
{item_id}-{request_id with hyphens removed}
```

Example:

```
1003-b8f7d0f2edca44c3bd1fb0a5765b3a2c
```

- The `item_id` is the **4-digit string** from the `items` table (e.g., `'1003'` for Tournament Registration).
- The `request_id` is a UUID with hyphens removed (32 characters).
- Total length is 37 characters, compliant with Square's 40-character limit.

This format is used for **all payment types** to ensure consistency and avoid Square API errors. The `generateReferenceId` utility handles this.

## 2. Request Service

### Purpose:

Manages requests for actions that require approval, validation, or payment, including team transfers, league/tournament registrations, etc. Now unified through the `team_change_requests` table.

### Implementation:

- Core table:
  - `team_change_requests`: Stores requests for **all** team-related changes.
- Key components:
  - `createTeamChangeRequest` (in `Payments.tsx`): Creates request records after successful payment.
  - `handle_request_status_update`: Database trigger function that executes actions based on `request_type`.

### Request Flow:

1. User initiates action through UI.
2. Frontend prepares `PaymentDetails` including `changeRequestType` and `changeRequestData`.
3. Payment is processed via `PaymentService`.
4. **Upon successful payment**, `PaymentService` calls `createTeamChangeRequest`.
5. `createTeamChangeRequest` inserts a record into `team_change_requests` with:
   - `request_type` (e.g., `'league_registration'`, `'tournament_registration'`, `'team_transfer'`).
   - `player_id` (as `uuid[]` array).
   - `status` set to `'processing'`.
   - Other relevant data (`team_id`, `league_id`, `tournament_id`, `old_value`, `new_value`, `metadata`).
6. Database trigger `handle_request_status_update` activates on status change to `'processing'`.
7. Trigger function executes the appropriate action based on `request_type`.
8. Request status updated to `'completed'` or `'failed'` based on execution result.

### Status Lifecycle:

- `pending`: (Less used now) Initial state, waiting for payment or approval.
- `processing`: Payment completed, request is being executed by the trigger.
- `completed`: Request successfully executed.
- `failed`: Request execution failed (check `last_error` field).
- `rejected`: Request was rejected by an administrator (manual process).

### Request Creation (`createTeamChangeRequest` in `Payments.tsx`):

```javascript
// Simplified example inside createTeamChangeRequest
const { data, error } = await supabase
  .from("team_change_requests")
  .insert({
    id: requestId, // Generated UUID for the request
    team_id: changeRequestData.teamId,
    request_type: changeRequestType, // e.g., 'league_registration'
    requested_by: changeRequestData.requestedBy,
    player_id: changeRequestData.playerId, // Array of UUIDs
    old_value: changeRequestData.oldValue,
    new_value: changeRequestData.newValue,
    status: "processing", // Trigger execution
    payment_reference: paymentId, // Link to payment record
    item_id: changeRequestData.itemId, // 4-digit item code
    league_id: changeRequestData.leagueId, // If applicable
    tournament_id: changeRequestData.tournamentId, // If applicable
    metadata: changeRequestData.metadata, // Nested metadata
  })
  .select()
  .single();
```

## 3. Webhook Service

### Purpose:

Handles asynchronous payment notifications (e.g., from CashApp, potentially future methods) and updates request statuses accordingly. _Note: Currently less critical for Square as processing is synchronous._

### Implementation:

- Located in: `backend/routes/webhooks.py` and potentially database trigger functions.
- Core methods:
  - `handle_square_webhook` (or other provider webhooks).
  - Logic to find associated request based on payment ID/reference.
  - Updates request status (e.g., to `'processing'` upon payment confirmation).

### Webhook Flow (Conceptual):

1. Payment provider sends webhook notification (e.g., payment completed).
2. Webhook handler verifies and processes the notification.
3. Extracts payment identifier and finds the corresponding `payment` record.
4. Finds the associated `team_change_requests` record via `request_id` or `payment_reference`.
5. Updates the request status (e.g., to `'processing'`).
6. Database trigger `handle_request_status_update` executes the action.

## 4. Implementation Guidelines for Consistency

### For New Request Types:

1.  **Define `item_id`**: Add the new action to the `items` table and note its 4-digit `item_id`.
2.  **UI Component**:
    - Use `TeamActionProcessor` or similar structure.
    - Gather necessary inputs.
    - Implement confirmation steps.
3.  **Payment Details Creation**:
    - Call `createPaymentDetails` utility.
    - Provide the correct `changeRequestType` string.
    - Include all necessary data within `metadata` and `metadata.changeRequestData`.
    - Ensure the correct 4-digit `item_id` is passed.
    - Use `generateReferenceId` for the `referenceId`.
4.  **Database Trigger**:
    - Update `handle_request_status_update` trigger function in Supabase.
    - Add a new `IF NEW.request_type = 'your_new_type' AND NEW.status = 'processing' THEN ... END IF;` block.
    - Implement the logic to execute the action (e.g., call an RPC function, update tables).
    - Update the request status to `'completed'` or `'failed'` with appropriate `metadata` logging.

## 5. Key Recent Fixes & Considerations

- **`item_id` vs `id`**: Always use the **4-digit string `item_id`** from the `items` table when referring to items in payment details, reference IDs, and change requests. The UUID `id` is the primary key but not the business identifier.
- **`player_id` Array**: The `team_change_requests.player_id` column is now `uuid[]`. Ensure an array of player UUIDs is always passed, even if only one player is involved.
- **`season` Field**: Include a `season` field in `metadata` and `metadata.changeRequestData` for consistency. Use the actual season for leagues and `0` for tournaments.
- **`reference_id` Length**: The format `{item_id}-{request_id_no_hyphens}` ensures compliance with Square's 40-character limit.
- **Unified Flow**: All paid actions should now follow the flow: Initiate -> Create Payment Details -> Process Payment -> Create Change Request -> Trigger Execution.

## 6. Debugging and Troubleshooting

### Common Issues:

1.  **Payment Processing Errors**:
    - Check `reference_id` format and length.
    - Verify `item_id` is the 4-digit code.
    - Check payment `metadata` structure against `PaymentDetails` type.
    - Verify Square API keys and environment.
2.  **Request Execution Failures**:
    - Check `team_change_requests` record: Is `status` 'processing'? Is `request_type` correct? Does `metadata` contain required fields?
    - Check database trigger `handle_request_status_update`: Does it handle the specific `request_type`? Are there SQL errors in the trigger logic?
    - Look for error messages in `team_change_requests.last_error` field.
3.  **Incorrect Data**:
    - Verify the correct `item_id` (4-digit) is being fetched and passed.
    - Ensure `player_id` is passed as an array `uuid[]`.
    - Check that `season` is included correctly (actual or `0`).

### Logging Best Practices:

- Log detailed `PaymentDetails` object before navigating to `/payments`.
- Log `paymentId` and `changeRequestData` inside `createTeamChangeRequest`.
- Add detailed logging within the `handle_request_status_update` trigger function for each request type branch.
- Include request IDs and payment IDs in logs.

## 7. Testing the Payment & Request Flow

1.  **Unit Testing**:
    - Test `createPaymentDetails` and `generateReferenceId` utilities.
    - Mock Square payment responses.
    - Test `createTeamChangeRequest` logic.
2.  **Integration Testing**:
    - Test full payment flow with Square sandbox.
    - Verify `team_change_requests` record creation.
    - Test database trigger execution for each `request_type`.
3.  **Manual Testing Checklist**:
    - Test League Registration.
    - Test Tournament Registration.
    - Test Team Transfer.
    - Test Roster Change, Rebrand, Online ID Change.
    - Verify successful payment creates request and executes action.
    - Verify failed payment does not create request.
    - Verify trigger errors update request status to 'failed' with error details.
    - Check `payments` and `team_change_requests` tables for correct data.
