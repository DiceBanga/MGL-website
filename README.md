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

## Installation

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.9 or higher)
- PostgreSQL
- Square Developer Account

### Frontend Setup
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

### Backend Setup
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
   cd backend
   uvicorn main:app --reload
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   npm run dev
   ```

3. Access the application at `http://localhost:3000`

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

## API Documentation
- Frontend API documentation is available at `/docs`
- Backend API documentation is available at `http://localhost:8000/docs`

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
