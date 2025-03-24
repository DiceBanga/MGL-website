# MGL Website

A modern web application for managing gaming leagues, tournaments, and payments.

## Description

The MGL Website is a full-stack application built with React, TypeScript, and Python. It provides a comprehensive platform for managing gaming leagues, tournaments, and secure payment processing. The application uses Square for payment processing and features a secure Python backend for handling sensitive operations.

### Key Features
- User authentication and authorization
- Tournament and league management
- Team and player registration
- Secure payment processing with Square
- Admin and owner dashboards
- Real-time updates and notifications
- Comprehensive testing suite for payment integration
- Detailed logging and error handling
- Request management system for approving team transfers and changes

## Project Structure

The project is organized into two main directories:

### Frontend
Contains all UI-related code and assets:
- React/TypeScript source code
- Vite configuration
- Frontend build tools and dependencies
- Public assets

### Backend
Contains all server-side code:
- FastAPI application
- Database models and connection management
- Payment processing services
- API routes
- Testing utilities (in the `tests` directory)
- Environment configuration
- Request processing scripts and utilities

## Technology Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Square Web Payments SDK
- React Router for navigation
- Zustand for state management

### Backend
- Python FastAPI
- SQLAlchemy ORM
- Supabase for database integration
- Square Python SDK
- PostgreSQL database
- Pydantic for data validation
- Detailed logging system

## Installation

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.9 or higher)
- PostgreSQL
- Square Developer Account
- Ngrok authtoken (for webhook development)

### Docker Setup (Recommended)
1. Make sure you have Docker and Docker Compose installed on your system.

2. Create a `.env` file in the root directory with required environment variables:
   ```env
   # Square Configuration
   SQUARE_ACCESS_TOKEN=your_square_access_token
   SQUARE_LOCATION_ID=your_square_location_id
   SQUARE_ENVIRONMENT=sandbox
   
   # Database Configuration
   DATABASE_URL=postgresql://postgres:postgres@db:5432/mgl
   
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Ngrok for webhook testing
   NGROK_AUTHTOKEN=your_ngrok_authtoken
   ```

3. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Ngrok Web Interface: http://localhost:4040

### Manual Setup

#### Frontend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/MGL-website.git
   cd MGL-website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   VITE_SQUARE_APP_ID=your_square_app_id
   VITE_SQUARE_LOCATION_ID=your_square_location_id
   VITE_SQUARE_ENVIRONMENT=sandbox
   ```

#### Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the backend directory:
   ```env
   SQUARE_ACCESS_TOKEN=your_square_access_token
   SQUARE_LOCATION_ID=your_square_location_id
   SQUARE_ENVIRONMENT=sandbox
   DATABASE_URL=postgresql://user:password@localhost/dbname
   
   # Supabase Configuration (required for team management features)
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Ngrok for webhook testing
   NGROK_AUTHTOKEN=your_ngrok_authtoken
   ```

## Operation

### Development
1. Start the backend server:
   ```bash
   # Run from the backend directory (recommended)
   cd backend
   uvicorn main:app --reload
   
   # Alternative method:
   npm run backend:dev
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   npm run frontend:dev
   # or directly with:
   # cd frontend
   # npm run dev
   ```

3. Access the application at `http://localhost:3000`

### Using Ngrok for Webhook Development

1. For testing webhooks locally, you can use ngrok which is included in the Docker setup:
   ```bash
   # With Docker
   docker-compose up ngrok
   ```

2. Or if you're running manually:
   ```bash
   ngrok http 8000
   ```

3. Visit the ngrok web interface at `http://localhost:4040` to see your public URL and incoming requests.

4. Configure your Square webhooks to point to your ngrok URL (e.g., `https://abc123.ngrok.io/api/webhook/square`).

### Managing Team Requests

The application includes a comprehensive request management system accessible via:
- Admin Dashboard: `/admin/requests`
- Owner Dashboard: `/owner/requests`

These pages allow administrators and owners to:
- View pending team change requests
- Approve team transfers and other changes
- Filter requests by type and status
- Search for specific requests
- Process requests in bulk

### Running Tests

#### Prerequisites for Testing

1. **Environment Variables**
   - Make sure your `.env` files are properly configured with test credentials
   - For Square tests, use sandbox credentials:
     ```env
     VITE_SQUARE_APP_ID=your_sandbox_app_id
     VITE_SQUARE_LOCATION_ID=your_sandbox_location_id
     SQUARE_ACCESS_TOKEN=your_sandbox_access_token
     SQUARE_ENVIRONMENT=sandbox
     ```

2. **Dependencies**
   - Install required dependencies:
     ```bash
     cd frontend
     npm install react-square-web-payments-sdk
     ```

3. **Backend Requirements**
   - The backend server does NOT need to be running for unit tests
   - For integration tests that test API endpoints, start the backend:
     ```bash
     cd backend
     python -m uvicorn main:app --reload
     ```

#### Running Different Types of Tests

1. **Frontend Unit Tests**
   ```bash
   cd frontend
   npm test
   ```
   This includes:
   - Payment form validation
   - Square SDK component tests
   - Utility function tests

2. **Frontend Integration Tests**
   ```bash
   # Terminal 1: Start backend
   cd backend
   python -m uvicorn main:app --reload

   # Terminal 2: Run tests
   cd frontend
   npm test
   ```
   This includes:
   - API endpoint tests
   - Payment processing tests
   - CORS validation

3. **Backend Tests**
   ```bash
   cd backend
   python -m pytest tests/
   ```

4. **Coverage Reports**
   ```bash
   # Frontend coverage
   cd frontend
   npm run test:coverage

   # Backend coverage
   cd backend
   python -m pytest tests/ --cov=. --cov-report=html
   ```

#### Test Categories

1. **Unit Tests**
   - Payment form validation
   - Square SDK component tests
   - Database operations
   - Utility functions

2. **Integration Tests**
   - API endpoints
   - Payment processing
   - CORS configuration

3. **End-to-End Tests**
   - Complete payment flow
   - User interactions
   - Error handling

#### Troubleshooting Tests

1. **Square SDK Issues**
   - Verify Square SDK is installed: `npm list react-square-web-payments-sdk`
   - Check sandbox credentials in `.env`
   - Ensure you're using test card numbers (e.g., 4111 1111 1111 1111)

2. **API Endpoint Issues**
   - Check if backend is running
   - Verify CORS configuration
   - Check network tab for request/response details

3. **Database Issues**
   - Verify database connection
   - Check test database exists
   - Ensure no conflicting operations

### Production
1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the backend server:
   ```bash
   cd backend
   uvicorn main:app
   ```

3. Serve the frontend build directory using your preferred web server

## Docker Deployment

### Building and Running
```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

### Production Deployment
For production deployment, consider:
1. Using environment-specific Docker Compose files
2. Setting up proper HTTPS with a reverse proxy like Nginx or Traefik
3. Using Docker Swarm or Kubernetes for orchestration
4. Implementing container health checks

## API Documentation
- Frontend API documentation is available at `/docs`
- Backend API documentation is available at `http://localhost:8000/docs`

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Docker Development Environment

For a more convenient development experience, we've set up a dedicated development Docker Compose configuration.

### Using Docker Development Mode

1. Start the development environment:
   ```bash
   docker-compose -f docker-compose.dev.yaml up --build
   ```

2. This setup includes:
   - Hot reloading for frontend and backend
   - Volume mapping for real-time code changes
   - Ngrok for webhook testing
   - PostgreSQL database with persistent data

3. Access the development services:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Ngrok Web Interface: http://localhost:4040

4. When using ngrok for webhook development, copy the public URL from the ngrok dashboard (e.g., `https://abc123.ngrok.io`) and use it to configure your payment provider's webhook settings.

### Square Webhook Setup

1. Log in to your Square Developer Dashboard
2. Navigate to your application settings
3. Go to the Webhooks section
4. Add a webhook with your ngrok URL (e.g., `https://abc123.ngrok.io/api/webhook/square`)
5. Select the webhook events you want to subscribe to (payments, refunds, etc.)
6. Save your webhook configuration

## Request Management System

The application includes a comprehensive request management system to handle various team-related actions such as team transfers, roster changes, and team rebranding.

### Key Features

- **Request Dashboard**: Accessible to admins and owners through `/admin/requests` and `/owner/requests`
- **Filtering and Search**: Filter requests by type, status, or search by ID and other attributes
- **Bulk Processing**: Select multiple requests to approve in a single action
- **Status Tracking**: Visual indicators for each status (pending, approved, processing, completed, failed)
- **Detailed Information**: View complete request details including metadata

### Request Types

The system handles various types of requests:

1. **Team Transfers**: Change of team ownership from one captain to another
2. **Team Rebranding**: Updating a team's name and other details
3. **Roster Changes**: Adjusting player roles or adding/removing players
4. **Online ID Changes**: Updating player online IDs for various games

### Processing Flow

1. Requests are created when users initiate actions through the UI
2. Payments (if required) are processed using Square
3. Request records are stored in the database with 'pending' status
4. Admin/Owner approves the request through the dashboard
5. Backend processes the request using appropriate functions
6. Request status is updated to 'completed' when successful

### Manual Processing

For special cases or troubleshooting, the system includes utility scripts:

```bash
# Process a specific team transfer
python scripts/approve_transfer.py --request-id YOUR_REQUEST_ID

# Process all pending team transfers
python scripts/process_pending_transfers.py --all
```

These scripts are particularly useful for troubleshooting payment webhooks or handling special cases.
