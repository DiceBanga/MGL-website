# Getting Started with n8n for the MGL Website

This guide will help you get started with n8n workflows for the MGL website's backend functionality.

## 1. Prerequisites

Before you begin, make sure you have:

- Docker and Docker Compose installed
- Access to your Supabase project credentials
- Square API credentials (for payment processing)
- Basic understanding of REST APIs and database operations

## 2. Setting Up Your Environment

### Initial Setup

1. Run the setup script to create the necessary directory structure and configuration files:

```bash
cd n8n_workflows
chmod +x setup.sh
./setup.sh
```

2. Edit the `.env` file with your actual credentials:

```bash
nano .env
```

3. Start the n8n container:

```bash
docker-compose up -d
```

4. Access the n8n editor at http://localhost:5678

### Credentials Setup

Before creating workflows, you need to set up credentials for:

1. **Supabase**:
   - In the n8n UI, go to Settings > Credentials
   - Click "Create New"
   - Search for "Supabase"
   - Enter your Supabase URL and API key

2. **Square**:
   - In the n8n UI, go to Settings > Credentials
   - Click "Create New"
   - Search for "Square"
   - Enter your Square API credentials

3. **HTTP Node** (for API endpoints):
   - In the n8n UI, go to Settings > Credentials
   - Click "Create New"
   - Search for "HTTP"
   - Set up any authorization needed for your endpoints

## 3. Workflow Structure

The workflows in this project follow a structured organization:

- **Core Workflows**: Main entry points and central processing
  - `request-processor`: Handles all request types
  - `payment-processor`: Manages payment creation and tracking
  
- **Team Workflows**: Team management operations
  - `team-transfer`: Handles team ownership transfers
  - `team-creation`: Manages team creation
  - `roster-change`: Handles player management
  
- **Registration Workflows**: Event registration
  - `tournament-registration`: Handles tournament registrations
  - `league-registration`: Handles league registrations
  
- **Payment Workflows**: Payment handling
  - `payment-webhook-handler`: Processes Square webhooks
  
- **Notification Workflows**: User communications
  - `user-notifications`: Sends notifications

## 4. Creating Your First Workflow

Let's create a simple workflow to test your setup:

1. In the n8n UI, click "Create New Workflow"
2. Name it "Supabase Test"
3. Add a "Manual Trigger" node (the start node)
4. Add a "Supabase" node:
   - Select your Supabase credentials
   - Operation: Select
   - Table: teams
   - Return All: True
5. Add a "Set" node to format the output
6. Click "Execute Workflow" to test

## 5. Understanding the Request Processor

The request processor is the central workflow that handles all requests:

1. It receives requests via an HTTP endpoint
2. Validates the request data
3. Creates a request record in the database
4. Routes to specific sub-workflows based on request type
5. Handles payment processing if required
6. Updates request status in the database
7. Returns a response to the client

### Example: Setting Up the Request Processor HTTP Endpoint

1. Start with a new workflow named "Request Processor"
2. Add an "HTTP Request" node as the trigger:
   - Authentication: None (we'll add this later)
   - HTTP Method: POST
   - Path: /api/requests
   - Response Mode: Last Node
3. Add a "Function" node for validation:
   - Write validation logic in JavaScript
   - Check for required fields
   - Generate a request ID if not provided
4. Add a "Supabase" node to insert the request record:
   - Operation: Insert
   - Table: team_change_requests
5. Add a "Switch" node to route based on request type:
   - Add cases for each request type
   - Connect each case to a sub-workflow
6. Add a "Set" node to format the response

## 6. Working with Supabase

The Supabase node allows you to interact with your database:

### Reading Data

```
Supabase Node Configuration:
- Credentials: [Your Supabase Credentials]
- Operation: Select
- Table: teams
- Filters: id=eq.{{$json.team_id}}
```

### Writing Data

```
Supabase Node Configuration:
- Credentials: [Your Supabase Credentials]
- Operation: Insert
- Table: team_change_requests
- Data: {{$json.requestData}}
```

### Updating Data

```
Supabase Node Configuration:
- Credentials: [Your Supabase Credentials]
- Operation: Update
- Table: teams
- ID Column: id
- ID Value: {{$json.team_id}}
- Data: {
  captain_id: "{{$json.new_captain_id}}",
  updated_at: "{{$now.toISOString()}}"
}
```

## 7. Working with Square Payments

For payment processing, follow this pattern:

1. Format payment data in a "Function" node:
   ```javascript
   return {
     json: {
       amount: $input.all()[0].json.amount * 100, // Convert to cents
       currency: "USD",
       source_id: $input.all()[0].json.source_id,
       idempotency_key: $input.all()[0].json.idempotency_key || $uuid(),
       reference_id: $input.all()[0].json.request_id
     }
   };
   ```

2. Add a "Square" node for payment creation:
   - Credentials: [Your Square Credentials]
   - Resource: Payments
   - Operation: Create Payment
   - Use the mapped values from your function node

3. Add error handling with a "IF" node:
   - Check for success: `{{$node["Square"].json.success == true}}`
   - If true: Continue with the workflow
   - If false: Handle error, update request status

## 8. Error Handling

Every workflow should include error handling:

1. Add an "Error Trigger" node to the workflow
2. Connect it to a "Function" node to format the error:
   ```javascript
   return {
     json: {
       error: $input.all()[0].json.error,
       workflow: $workflow.name,
       timestamp: new Date().toISOString()
     }
   };
   ```
3. Add a "Supabase" node to update the request status:
   - Operation: Update
   - Table: team_change_requests
   - Data: {status: "failed", metadata: {error: "{{$node["Function"].json.error}}"}}

## 9. Testing and Debugging

To test and debug your workflows:

1. **Test Mode**:
   - Use the "Execute Workflow" button to run workflows in test mode
   - Inspect the output of each node
   
2. **HTTP Request Testing**:
   - Use Postman or curl to send requests to your workflows
   - Example curl request:
     ```bash
     curl -X POST http://localhost:5678/webhook/request-processor \
       -H "Content-Type: application/json" \
       -d '{"request_type":"team_transfer","team_id":"123"}'
     ```

3. **Logging**:
   - Add "Function" nodes with console.log statements
   - Check the n8n logs in the docker logs:
     ```bash
     docker-compose logs -f n8n
     ```

## 10. Workflow Deployment

When you're ready to deploy to production:

1. Export your workflows from the n8n UI
2. Save them to the appropriate directories in the project
3. Use version control to track changes
4. Deploy using CI/CD or manual process to your production n8n instance

## 11. Integration with Frontend

To integrate with the frontend:

1. Update API URL references in the frontend to point to n8n endpoints
2. Ensure response formats match what the frontend expects
3. Test all API interactions thoroughly
4. Implement proper error handling on both sides

## 12. Next Steps

Once you've got the basics working, consider:

1. Adding more sophisticated validation
2. Implementing caching for frequently accessed data
3. Setting up monitoring and alerting
4. Creating dashboard workflows for administration
5. Adding analytics workflows to track usage patterns 