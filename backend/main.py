from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from square.client import Client
from pydantic import BaseModel
import os
import logging
import uuid
import json
from dotenv import load_dotenv
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Change to DEBUG level for more details
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(debug=True)  # Enable debug mode

# Add a simple test route that should always work
@app.get("/ping")
def ping():
    logger.info("PING endpoint was accessed!")
    return {"ping": "pong", "time": str(uuid.uuid4())}

# Simple test route to verify endpoint registration
@app.get("/hello")
def hello():
    return {"message": "Hello World"}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Also add manual CORS headers to every response for extra certainty
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    logger.info(f"Request path: {request.url.path}")
    logger.info(f"Request method: {request.method}")
    
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        logger.info("Handling OPTIONS preflight request")
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "http://localhost:3001",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400",
            },
        )
    
    # For regular requests, process the request and add CORS headers to response
    response = await call_next(request)
    
    # Add CORS headers to every response
    origin = request.headers.get("origin", "http://localhost:3001")
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# Initialize Square client with sandbox environment
square_client = Client(
    access_token=os.getenv('SQUARE_ACCESS_TOKEN'),
    environment=os.getenv('SQUARE_ENVIRONMENT', 'sandbox')  # Make sure this is 'sandbox' for testing
)

# Define the payment request model
class PaymentRequest(BaseModel):
    sourceId: str
    amount: float
    idempotencyKey: str = None
    note: str = None
    referenceId: str = None

# Square Payment Endpoint
@app.post("/payments")
def create_payment(request: PaymentRequest):
    logger.info(f"Payment request received: {request}")
    
    # Log environment variables for debugging
    logger.info(f"SQUARE_ENVIRONMENT: {os.getenv('SQUARE_ENVIRONMENT')}")
    logger.info(f"SQUARE_LOCATION_ID: {os.getenv('SQUARE_LOCATION_ID')}")
    
    # Check for access token without logging the full token (security)
    access_token = os.getenv('SQUARE_ACCESS_TOKEN')
    logger.info(f"SQUARE_ACCESS_TOKEN present: {bool(access_token)}")
    
    # Generate idempotency key if not provided
    idempotency_key = request.idempotencyKey or str(uuid.uuid4())
    logger.info(f"Using idempotency key: {idempotency_key}")
    
    # Convert amount to cents (integer)
    amount_in_cents = int(request.amount * 100)
    
    # Create payment body
    body = {
        "source_id": request.sourceId,
        "amount_money": {
            "amount": amount_in_cents,
            "currency": "USD"
        },
        "idempotency_key": idempotency_key,
        "location_id": os.getenv('SQUARE_LOCATION_ID')
    }
    
    # Add optional fields if present
    if request.note:
        body["note"] = request.note
    if request.referenceId:
        body["reference_id"] = request.referenceId
    
    logger.info(f"Calling Square API with body: {json.dumps(body, default=str)}")
    
    try:
        # Create Square client for this request
        client = Client(
            access_token=os.getenv('SQUARE_ACCESS_TOKEN'),
            environment=os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
        )
        
        logger.info("Calling Square API to create payment")
        result = client.payments.create_payment(body)
        
        if result.is_success():
            payment = result.body["payment"]
            logger.info(f"Payment successful! ID: {payment['id']}")
            
            # Return the payment details
            return {"payment": payment}
        elif result.is_error():
            errors = result.errors
            logger.error(f"Square API Error: {errors}")
            
            # Format errors for client
            error_messages = []
            for error in errors:
                error_messages.append(f"{error.get('category')}: {error.get('detail')}")
                
            raise HTTPException(
                status_code=400, 
                detail={
                    "message": "Payment failed",
                    "errors": error_messages,
                    "square_errors": errors
                }
            )
    except Exception as e:
        logger.exception(f"Exception in payment processing: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Internal server error during payment processing",
                "error": str(e)
            }
        )

# Root endpoint for testing
@app.get("/")
def root():
    return {"message": "Square Payment API", "status": "running"}

# Test endpoint for debugging
@app.get("/test")
def test_endpoint():
    return {"status": "ok", "message": "API is working"}

# Add a specific test endpoint for Square payments
@app.post("/square-test-payment")
def square_test_payment(request: PaymentRequest):
    logger.info(f"Square TEST payment request received: {request}")
    
    # Log environment variables for debugging
    logger.info(f"SQUARE_ENVIRONMENT: {os.getenv('SQUARE_ENVIRONMENT')}")
    logger.info(f"SQUARE_LOCATION_ID: {os.getenv('SQUARE_LOCATION_ID')}")
    
    # Check for access token without logging the full token (security)
    access_token = os.getenv('SQUARE_ACCESS_TOKEN')
    logger.info(f"SQUARE_ACCESS_TOKEN present: {bool(access_token)}")
    
    # Generate idempotency key if not provided
    idempotency_key = request.idempotencyKey or str(uuid.uuid4())
    logger.info(f"Using idempotency key: {idempotency_key}")
    
    # Convert amount to cents (integer)
    amount_in_cents = int(request.amount * 100)
    
    # Create payment body
    body = {
        "source_id": request.sourceId,
        "amount_money": {
            "amount": amount_in_cents,
            "currency": "USD"
        },
        "idempotency_key": idempotency_key,
        "location_id": os.getenv('SQUARE_LOCATION_ID')
    }
    
    # Add optional fields if present
    if request.note:
        body["note"] = request.note
    if request.referenceId:
        body["reference_id"] = request.referenceId
    
    logger.info(f"Calling Square API with body: {json.dumps(body, default=str)}")
    
    try:
        # Create Square client for this request
        client = Client(
            access_token=os.getenv('SQUARE_ACCESS_TOKEN'),
            environment=os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
        )
        
        logger.info("Calling Square API to create payment")
        result = client.payments.create_payment(body)
        
        if result.is_success():
            payment = result.body["payment"]
            logger.info(f"Payment successful! ID: {payment['id']}")
            
            # Return the payment details
            return {"payment": payment}
        elif result.is_error():
            errors = result.errors
            logger.error(f"Square API Error: {errors}")
            
            # Format errors for client
            error_messages = []
            for error in errors:
                error_messages.append(f"{error.get('category')}: {error.get('detail')}")
                
            raise HTTPException(
                status_code=400, 
                detail={
                    "message": "Payment failed",
                    "errors": error_messages,
                    "square_errors": errors
                }
            )
    except Exception as e:
        logger.exception(f"Exception in payment processing: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Internal server error during payment processing",
                "error": str(e)
            }
        )

# Square test payment endpoint in /api path to match what frontend is looking for
@app.post("/api/square-test-payment")
def api_square_test_payment(request: PaymentRequest):
    """Square payment test endpoint under /api prefix for frontend testing."""
    logger.info(f"API Square TEST payment request received: {request}")
    # Just call the same implementation as the non-prefixed endpoint
    return square_test_payment(request)

# Print out routes and config for debugging
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up FastAPI application...")
    
    # Get and print all registered routes for debugging
    routes = []
    for route in app.routes:
        path = getattr(route, "path", "")
        name = getattr(route, "name", "")
        methods = getattr(route, "methods", set())
        routes.append(f"{path} [{','.join(methods)}] [{name}]")
    
    logger.info(f"Available routes: {routes}")
    
    logger.info(f"SQUARE_ENVIRONMENT: {os.getenv('SQUARE_ENVIRONMENT')}")
    logger.info(f"Has SQUARE_LOCATION_ID: {'Yes' if os.getenv('SQUARE_LOCATION_ID') else 'No'}")
    logger.info(f"Has SQUARE_ACCESS_TOKEN: {'Yes' if os.getenv('SQUARE_ACCESS_TOKEN') else 'No'}")

@app.get("/debug-request")
async def debug_request(request: Request):
    """Debug endpoint to log request details"""
    logger.info(f"Request URL: {request.url}")
    logger.info(f"Request base URL: {request.base_url}")
    logger.info(f"Request path: {request.url.path}")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request headers: {request.headers}")
    
    # Also check all registered routes
    routes_info = []
    for route in app.routes:
        path = getattr(route, "path", "")
        name = getattr(route, "name", "")
        methods = getattr(route, "methods", set())
        routes_info.append(f"{path} [{','.join(methods)}] [{name}]")
    
    return {
        "url": str(request.url),
        "base_url": str(request.base_url),
        "path": request.url.path,
        "method": request.method,
        "registered_routes": routes_info
    }

@app.get("/square-test")
def square_test():
    logger.info("Square TEST endpoint accessed via GET")
    return {"status": "ok", "message": "Square test endpoint is working"}

# Standard payments endpoint in /api path for frontend compatibility
@app.post("/api/payments")
def api_payments(request: PaymentRequest):
    """Standard payments endpoint under /api prefix for frontend compatibility."""
    logger.info(f"API Payments endpoint request received: {request}")
    # Just call the same implementation as the non-prefixed endpoint
    return create_payment(request)

# Add this endpoint after your existing endpoints
@app.post("/api/payment-test")
async def test_payment(payment: PaymentRequest):
    """Test endpoint that logs request data but doesn't make real API calls"""
    print("=========== TEST PAYMENT REQUEST ===========")
    print(f"Payment source ID: {payment.sourceId}")
    print(f"Amount: {payment.amount}")
    print(f"Idempotency key: {payment.idempotencyKey}")
    print(f"Note: {payment.note}")
    print(f"Reference ID: {payment.referenceId}")
    print("============================================")
    
    # Return success response without calling Square API
    return {
        "success": True,
        "message": "Test payment received successfully!",
        "payment_id": f"test-{payment.idempotencyKey}",
        "created_at": datetime.now().isoformat(),
        "status": "APPROVED",
        "amount": payment.amount,
        "card": {
            "last4": "1111",
            "brand": "VISA",
            "exp_month": "12",
            "exp_year": "2025"
        }
    }