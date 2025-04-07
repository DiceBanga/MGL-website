# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.12.0] - 2025-04-06

### Fixed

- **Payment & Request Flow:**
  - Resolved Square `reference_id` length issue by implementing a standardized format (`{item_id}-{request_id_no_hyphens}`).
  - Fixed missing `season` data by consistently including it in metadata (defaulting to `0` for tournaments).
  - Corrected `team_change_requests` handling to support multiple players by changing `player_id` column to `uuid[]` and updating frontend logic to pass arrays.
  - Fixed incorrect item ID usage by ensuring the 4-digit `item_id` (e.g., '1003') is used instead of the UUID `id` throughout the payment and request creation process.
  - Unified League and Tournament registration flows to use the `createTeamChangeRequest` function after successful payment for consistent handling.
  - Added optional `changeRequestType` to `PaymentDetails` interface for better type safety and flexibility.
- **Backend API:**
  - Identified and resolved 500 Internal Server Errors on `/api/leagues/{id}` and `/api/tournaments/{id}` endpoints (initially caused by backend server not running).

### Changed

- **Request Handling:** Unified all paid actions (League/Tournament Registration, Team Transfer, etc.) to create a `team_change_requests` record upon successful payment, triggering execution via database function `handle_request_status_update`.
- **Metadata:** Standardized the `PaymentDetails.metadata` structure, including `changeRequestData`, across different request types for consistency.
- **Database:** Migrated `team_change_requests.player_id` to `uuid[]` and dropped incompatible foreign key constraints.

## [1.11.0] - 2024-05-30

### Request Management System

- Added dedicated Requests tab to both AdminPanel and OwnerDashboard
- Implemented comprehensive RequestsManager component with filtering and search capabilities
- Added backend API endpoint for approving and processing team transfer requests
- Fixed team transfer processing by correctly calling team ownership transfer function
- Created utility scripts for manually processing pending transfers
- Improved request status tracking with visual indicators for each state
- Enhanced bulk action capabilities for processing multiple requests
- Added detailed request descriptions and metadata display
- Fixed issues with APIResponse handling in async functions for request processing
- Implemented proper parameter handling for admin_transfer_team_ownership function
- Added comprehensive error handling for request processing failures
- TODO: Test auto-execute functionality on successful payment for team transfers and other requests

## [1.10.0] - 2024-05-24

### Webhook Handler Improvements

- Fixed Square webhook handling for team transfers to properly process completed payments
- Resolved team transfer webhook issues by properly handling Supabase API responses
- Added direct RPC calls to admin_transfer_team_ownership function in webhook handler
- Improved error handling and status tracking for webhook processing
- Enhanced request status updates with better metadata and error tracking
- Added comprehensive logging throughout webhook processing pipeline
- Fixed issues with APIResponse handling in async functions
- Created testing framework for webhook handler with pytest-asyncio support
- Added mock tests for Square webhook processing and team transfer execution
- Improved extraction of request IDs from payment references

### Payment Processing Enhancements

- Fixed metadata structure preservation in payment processing
- Ensured consistent payment request handling across different API endpoints
- Fixed database integration for payment records with proper metadata structure
- Added error handling for payment processing to gracefully handle failures
- Enhanced payment reference ID generation and tracking

## [1.9.0] - 2024-05-15

### Centralized Request System

- Implemented a centralized request system for all team management actions
- Created reusable `TeamActionProcessor` component for unified action handling
- Added request processing for team transfers, roster changes, and registrations
- Enhanced data fetching in `TeamDashboard` for non-captains
- Fixed database field mapping between players and UI components
- Added support for all action types in a single processor component
- Implemented request handling with payment integrations
- Created backend service for executing approved requests
- Added comprehensive form interfaces for all request types

### Team Dashboard Improvements

- Added distinct views for captains and non-captains
- Enhanced team data fetching to support various user roles
- Fixed issues with league and tournament roster display
- Added support for viewing roster information for team members
- Integrated centralized action processor for all team management
- Fixed player data mapping to correctly display user information

### Database Schema

- Updated database queries to properly fetch related entity data
- Fixed relationship mappings between teams, players, and rosters
- Improved database field consistency across tables
- Added proper error handling for database queries

## [1.8.0] - 2024-05-01

### Backend Improvements

- Standardized environment variable naming conventions for Supabase integration
- Updated backend to properly run as a Python package with `uvicorn backend.main:app`
- Fixed environment variable loading for relative vs. absolute imports
- Enhanced project structure to support proper Python packaging
- Updated documentation to reflect new recommended backend startup method

### Environment Configuration

- Aligned environment variable names with Supabase SDK expectations
- Updated Supabase client creation to use `SUPABASE_ANON_KEY` instead of `SUPABASE_KEY`
- Improved environment variable documentation in README
- Enhanced backward compatibility with existing .env files

### DevOps & Deployment

- Updated Docker configuration to support package-based backend structure
- Added Supabase environment variables to docker-compose.yaml
- Modified backend Dockerfile to correctly structure the application as a package
- Updated PYTHONPATH in Docker container for proper module resolution
- Improved Docker container startup command to use the correct module path

## [1.7.0] - 2024-04-15

### Payment System Enhancements

- Implemented centralized payment utilities with `createPaymentDetails` function
- Created reusable `ConfirmationDialog` component for payment confirmations
- Fixed team transfer functionality to properly handle payment state
- Standardized payment metadata format across all payment types
- Added support for creating team change requests after successful payments
- Improved error handling and validation for payment details
- Fixed team ownership transfer by using the correct RPC function with proper parameters
- Fixed UUID generation for team change requests to ensure proper format
- Fixed team transfer process to create team change request record before updating team captain
- Added detailed debugging logs for team transfer process to troubleshoot UUID issues
- Fixed payment ID handling to ensure proper propagation to team change requests
- Enhanced error handling for credit card validation errors
- Fixed metadata structure in payment records to include all required fields
- Added UUID validation to prevent invalid UUID format errors
- Separated team change request creation and team captain update to avoid conflicts

### Team Dashboard Improvements

- Enhanced Front Office section with consistent payment flows
- Updated tournament and league registration to use standardized payment process
- Fixed player signing request functionality with proper metadata
- Improved online ID change process with confirmation dialog
- Added team rebranding functionality with payment integration
- Enhanced team ownership transfer with proper change request creation
- Fixed team captain transfer to correctly update team ownership after payment
- Added SQL function to properly handle team deletion
- Added ability for owners to change team captains directly from the Owner Dashboard

### Database Integration

- Added support for creating team change requests in the database
- Implemented standardized request ID generation using UUID
- Enhanced payment record creation with consistent metadata
- Added support for tracking payment status and change requests

### User Experience

- Added confirmation dialogs for all payment-related actions
- Improved feedback during payment processing
- Enhanced error handling and validation for user inputs
- Standardized payment flow across all team management actions

## [1.6.0] - 2024-03-20

### Team Dashboard Enhancements

- Improved Team Transfer process with two-step confirmation and payment integration
- Added payment completion handling to execute team ownership transfer only after successful payment
- Implemented standardized reference ID format for all payment types
- Added Front Office section with dedicated management features
- Reorganized dashboard layout with grid system for better usability
- Enhanced player search functionality for team transfers

### Payment System

- Implemented consistent payment flow across all team management actions
- Added confirmation modals for all payment-related actions
- Created standardized payment data structure with proper reference IDs
- Added payment status tracking and request management
- Improved error handling for payment failures

### User Experience

- Added two-step confirmation process for all team management actions
- Enhanced visual design with consistent styling across modals
- Improved feedback for payment status and action results
- Added detailed confirmation screens with action summaries
- Implemented player search functionality for team management

### Database

- Added team_change_requests table to track pending and completed changes
- Enhanced request tracking with metadata and reference IDs
- Added status tracking for payment-dependent operations

## [1.5.0] - 2024-03-14

### Authentication & Authorization

- Added owner role functionality with elevated access privileges
- Implemented owner-specific routes and components
- Added Owner Dashboard with comprehensive management features
- Enhanced Admin Management system with role-based access control
- Updated user authentication to handle owner privileges
- Added SQL migrations for owner role management

### User Interface

- Created new Owner Panel with dedicated navigation
- Updated UserDashboard to show Owner/Admin access buttons
- Added Admin Management interface for owner control
- Enhanced navigation between Owner, Admin, and User dashboards
- Implemented consistent styling across all dashboard types
- Added statistics and activity tracking for owner dashboard

### Database

- Added owner role to auth.users metadata
- Updated players table to support owner role
- Added new policies for owner-level access control
- Enhanced admin management capabilities
- Added role-based security policies

### Security

- Implemented role-based access control (RBAC)
- Added owner-specific database policies
- Enhanced user role validation
- Added secure role transition handling
- Updated authentication guards for owner routes

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
