# Tournament Registration Workflow

## Purpose
This workflow handles the registration of teams for tournaments, including player selection, validation, payment processing, and database updates.

## Trigger
- Triggered by the main request processor when `request_type` is "tournament_registration"
- Receives the full request data structure

## Input Requirements
- `team_id`: UUID of the team registering
- `tournament_id`: UUID of the tournament
- `requested_by`: UUID of user making the request (must be team captain)
- `player_ids`: Array of player UUIDs to register
- `payment_data`: Payment information if requires_payment is true
- `metadata`: Additional tournament-specific information

## Workflow Steps

### 1. Tournament Validation
- **Node Type:** Supabase
- **Purpose:** Verify tournament exists and is open for registration
- **Actions:**
  - Query tournaments table with tournament_id
  - Check registration_open flag
  - Verify tournament dates and capacity
  - Return error if tournament is full or closed

### 2. Team Validation
- **Node Type:** Supabase
- **Purpose:** Verify team eligibility
- **Actions:**
  - Check if team is already registered for this tournament
  - Verify the team meets tournament requirements
  - Check for outstanding payments or disciplinary issues
  - Return error if validation fails

### 3. Permission Validation
- **Node Type:** Supabase
- **Purpose:** Verify requesting user is the team captain
- **Actions:**
  - Query teams table to check if requested_by matches captain_id
  - Return error if validation fails

### 4. Player Validation
- **Node Type:** Function
- **Purpose:** Validate player selection
- **Actions:**
  - Verify all players are members of the team
  - Check minimum/maximum player requirements for tournament
  - Validate player eligibility (based on tournament rules)
  - Return error if validation fails

### 5. Calculate Registration Fee
- **Node Type:** Function
- **Purpose:** Calculate the registration fee
- **Actions:**
  - Get tournament base fee
  - Apply any team-specific or early registration discounts
  - Calculate final amount
  - Return fee amount for payment processing

### 6. Update Request with Fee
- **Node Type:** Supabase
- **Purpose:** Update request record with fee information
- **Actions:**
  - Update the request record with the fee amount
  - Add fee calculation details to metadata

### 7. Process Payment (if required)
- **Node Type:** Sub-workflow
- **Purpose:** Process payment for the registration
- **Actions:**
  - Call the payment-processor sub-workflow
  - Pass request_id and payment amount
  - Store payment reference in request record
  - Wait for payment confirmation

### 8. Execute Registration
- **Node Type:** Supabase
- **Purpose:** Register team in the tournament
- **Actions:**
  - Insert record in tournament_teams table
  - Insert records in tournament_players table for each selected player
  - Update tournament registration count
  - Set registration status to "active"

### 9. Generate Tournament Documents
- **Node Type:** Function
- **Purpose:** Create necessary tournament documentation
- **Actions:**
  - Generate team roster document
  - Create registration confirmation
  - Prepare any required waivers or forms

### 10. Send Notifications
- **Node Type:** Sub-workflow
- **Purpose:** Send notifications about the registration
- **Actions:**
  - Call user-notifications sub-workflow
  - Send confirmation to team captain
  - Send notification to registered players
  - Send notification to tournament administrators

### 11. Add to Tournament Communication
- **Node Type:** Function
- **Purpose:** Add team to tournament communications
- **Actions:**
  - Add captain to tournament announcement channel
  - Add players to tournament communication group
  - Subscribe team to tournament updates

### 12. Update Request Status
- **Node Type:** Supabase
- **Purpose:** Finalize the request record
- **Actions:**
  - Update status to "completed"
  - Add registration details to metadata
  - Set completed_at timestamp

### 13. Return Response
- **Node Type:** Function
- **Purpose:** Format response for the main workflow
- **Actions:**
  - Create success response object
  - Include registration confirmation details
  - Include next steps information
  - Return formatted response

## Error Handling

### Tournament Validation Error
- If tournament is invalid, closed, or full:
  - Update request status to "failed"
  - Return specific error message about tournament status
  - Include information about alternative tournaments if available

### Team Validation Error
- If team is already registered or ineligible:
  - Update request status to "failed"
  - Return error message with details on why registration failed
  - Include steps to resolve eligibility issues if applicable

### Player Validation Error
- If player selection is invalid:
  - Update request status to "failed"
  - Return error with details on player issues
  - Include minimum/maximum player requirements

### Payment Failure
- If payment processing fails:
  - Update request status to "payment_failed"
  - Store error details in metadata
  - Return error with payment failure reason
  - Include option to retry payment

### Registration Error
- If team registration fails:
  - Attempt to reverse payment if possible
  - Update request status to "failed"
  - Log detailed error for administrators
  - Return error message to user

## Database Operations

### Required Tables
- `tournaments` - To validate tournament information
- `teams` - To validate team information
- `team_players` - To validate player membership
- `tournament_teams` - To register the team
- `tournament_players` - To register individual players
- `team_change_requests` - To update request status

### SQL Operations
- Register team in tournament:
  ```sql
  INSERT INTO tournament_teams (tournament_id, team_id, registration_date, status, payment_id)
  VALUES (:tournament_id, :team_id, now(), 'active', :payment_id)
  ```

- Register players in tournament:
  ```sql
  INSERT INTO tournament_players (tournament_id, team_id, user_id, registration_date, status)
  SELECT :tournament_id, :team_id, unnest(:player_ids), now(), 'active'
  ```

- Update tournament registration count:
  ```sql
  UPDATE tournaments
  SET current_teams = current_teams + 1
  WHERE id = :tournament_id
  ```

## Integration Points

- Integrates with the main request-processor workflow
- Integrates with the payment-processor workflow
- Integrates with the user-notifications workflow
- Integrates with document generation services if applicable

## Expected Output

```json
{
  "success": true,
  "request_id": "uuid-of-request",
  "team_id": "uuid-of-team",
  "tournament_id": "uuid-of-tournament",
  "registration_id": "uuid-of-registration",
  "status": "completed",
  "player_count": 5,
  "payment_amount": 100.00,
  "next_steps": [
    "Check your email for the registration confirmation",
    "Complete player waivers by [deadline]",
    "Join the tournament Discord channel at [link]"
  ],
  "completed_at": "ISO8601-timestamp"
}
``` 