# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2024-03-10

### Project Organization
- Moved all test files into a dedicated `tests` directory in the backend
- Created test package with `__init__.py` file
- Added npm scripts for running backend tests
- Updated documentation with new test organization details
- Created directory for test results in Docker container

## [1.3.0] - 2024-03-10

### DevOps & Deployment
- Added Docker support for containerized deployment
- Created Dockerfiles for both frontend and backend services
- Added Docker Compose configuration for orchestration
- Included PostgreSQL database container
- Added .dockerignore files to optimize container builds
- Updated documentation with Docker setup instructions

## [1.2.0] - 2024-03-10

### Project Structure
- Reorganized codebase with clear frontend and backend separation
- Created dedicated frontend directory for all UI-related code
- Moved configuration files to appropriate directories
- Updated build scripts for new directory structure

### Testing & Development
- Added comprehensive testing suite for payment processing
- Created test scripts for Square payment integration
- Implemented database testing utilities
- Added test server for local development
- Added tools for examining and debugging payment records

### Backend Enhancements
- Added detailed logging throughout the payment process
- Improved error handling for payment processing
- Implemented environment validation checks
- Added configuration verification for Square integration

## [1.1.0] - 2024-03-01

### Added
- Python FastAPI backend integration for secure payment processing
- SQLAlchemy database integration for payment records
- Payment service layer for better separation of concerns
- Comprehensive error handling and logging
- CORS middleware for secure frontend-backend communication
- Environment variable management with python-dotenv
- Payment model using Pydantic for request validation
- Database connection pooling and session management

### Changed
- Moved payment processing from Supabase Edge Functions to Python backend
- Updated frontend API calls to use new Python backend endpoints
- Improved error handling and user feedback
- Enhanced payment validation and security measures

### Security
- Implemented secure API key management
- Added request validation using Pydantic
- Improved error handling and logging
- Centralized payment processing through backend service 