# Team Transfer Workflow

## Purpose
This workflow handles the transfer of team ownership from the current captain to a new captain. It includes validation, payment processing, and database updates.

## Trigger
- Triggered by the main request processor when `request_type` is "team_transfer"
- Receives the full request data structure

## Input Requirements
- `team_id`: UUID of the team
- `requested_by`: UUID of current captain (must be verified)
- `new_captain_id`: UUID of the new captain
- `payment_data`: Payment information if requires_payment is true

## Workflow Steps

### 1. Permission Validation
- **Node Type:** Supabase
- **Purpose:** Verify requesting user is the team captain
- **Actions:**
  - Query teams table to check if requested_by matches captain_id
  - Return error if validation fails

### 2. New Captain Validation
- **Node Type:** Supabase
- **Purpose:** Verify new captain is a team member
- **Actions:**
  - Query team_players table to check if new_captain_id is a team member
  - Check for existing pending transfer requests
  - Return error if validation fails

### 3. Calculate Transfer Fee
- **Node Type:** Function
- **Purpose:** Calculate the transfer fee
- **Actions:**
  - Apply any team-specific or seasonal discounts
  - Set standard fee (e.g., $20.00)
  - Return fee amount for payment processing

### 4. Update Request with Fee
- **Node Type:** Supabase
- **Purpose:** Update request record with fee information
- **Actions:**
  - Update the request record with the fee amount
  - Add fee calculation details to metadata

### 5. Process Payment (if required)
- **Node Type:** Sub-workflow
- **Purpose:** Process payment for the transfer
- **Actions:**
  - Call the payment-processor sub-workflow
  - Pass request_id and payment amount
  - Wait for payment confirmation

### 6. Execute Transfer
- **Node Type:** Supabase
- **Purpose:** Update team captain in database
- **Actions:**
  - Update teams table to set captain_id to new_captain_id
  - Update team_players records to change roles
    - Set old captain's role to "player"
    - Set new captain's role to "captain"
  - Update can_be_deleted flags accordingly

### 7. Notify Users
- **Node Type:** Sub-workflow
- **Purpose:** Send notifications about the transfer
- **Actions:**
  - Call user-notifications sub-workflow
  - Notify old captain of completed transfer
  - Notify new captain of new responsibilities
  - Notify other team members of the change

### 8. Update Request Status
- **Node Type:** Supabase
- **Purpose:** Finalize the request record
- **Actions:**
  - Update status to "completed"
  - Add transfer details to metadata
  - Set completed_at timestamp

### 9. Return Response
- **Node Type:** Function
- **Purpose:** Format response for the main workflow
- **Actions:**
  - Create success response object
  - Include updated team details
  - Return formatted response

## Error Handling

### Captain Permission Error
- If requesting user is not the team captain:
  - Update request status to "failed"
  - Return error message: "Only the team captain can transfer ownership"

### New Captain Validation Error
- If new captain is not a team member:
  - Update request status to "failed"
  - Return error message: "New captain must be an existing team member"

### Payment Failure
- If payment processing fails:
  - Update request status to "payment_failed"
  - Store error details in metadata
  - Return error with payment failure reason

### Database Update Error
- If team update fails:
  - Attempt to reverse payment if possible
  - Update request status to "failed"
  - Log detailed error for administrators
  - Return generic error message to user

## Database Operations

### Required Tables
- `teams` - To update the captain_id
- `team_players` - To update player roles
- `team_change_requests` - To update request status

### SQL Operations
- Update team captain:
  ```sql
  UPDATE teams
  SET captain_id = :new_captain_id, updated_at = now()
  WHERE id = :team_id
  ```

- Update old captain role:
  ```sql
  UPDATE team_players
  SET role = 'player', can_be_deleted = true, updated_at = now()
  WHERE team_id = :team_id AND user_id = :old_captain_id
  ```

- Update new captain role:
  ```sql
  UPDATE team_players
  SET role = 'captain', can_be_deleted = false, updated_at = now()
  WHERE team_id = :team_id AND user_id = :new_captain_id
  ```

## Integration Points

- Integrates with the main request-processor workflow
- Integrates with the payment-processor workflow
- Integrates with the user-notifications workflow

## Expected Output

```json
{
  "success": true,
  "request_id": "uuid-of-request",
  "team_id": "uuid-of-team",
  "old_captain_id": "uuid-of-old-captain",
  "new_captain_id": "uuid-of-new-captain",
  "status": "completed",
  "completed_at": "ISO8601-timestamp"
}
``` 