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

### Docker Setup (Recommended)
1. Make sure you have Docker and Docker Compose installed on your system.

2. Create a `.env` file in the root directory with required environment variables:
   ```env
   SQUARE_ACCESS_TOKEN=your_square_access_token
   SQUARE_LOCATION_ID=your_square_location_id
   SQUARE_ENVIRONMENT=sandbox
   DATABASE_URL=postgresql://postgres:postgres@db:5432/mgl
   ```

3. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

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
   ```

## Operation

### Development
1. Start the backend server:
   ```bash
   npm run backend:dev
   # or directly with:
   # cd backend
   # uvicorn main:app --reload
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   npm run frontend:dev
   # or directly with:
   # cd frontend
   # npm run dev
   ```

3. Access the application at `http://localhost:3000`

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
