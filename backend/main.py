from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from square.client import Client
from pydantic import BaseModel
import os
import logging
import uuid
import json
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

# Simplified CORS handling - manually set headers to make sure they're applied
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
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, content-type, Origin",
                "Access-Control-Max-Age": "86400",
            },
        )
    
    # For regular requests, process the request and add CORS headers to response
    response = await call_next(request)
    
    # Add CORS headers to every response
    response.headers["Access-Control-Allow-Origin"] = "*" 
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, x-client-info, apikey, content-type, Origin"
    
    return response

# Initialize Square client - using the simplified approach
square_client = Client(
    access_token=os.getenv('SQUARE_ACCESS_TOKEN'),
    environment=os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
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
    
    try:
        logger.info("Calling Square API to create payment")
        result = square_client.payments.create_payment(body)
        
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

# Print out routes and config for debugging
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up FastAPI application...")
    routes = [f"{route.path} [{route.name}]" for route in app.routes]
    logger.info(f"Available routes: {routes}")
    
    # Log environment variables (non-sensitive ones)
    logger.info(f"SQUARE_ENVIRONMENT: {os.getenv('SQUARE_ENVIRONMENT')}")
    logger.info(f"Has SQUARE_LOCATION_ID: {'Yes' if os.getenv('SQUARE_LOCATION_ID') else 'No'}")
    logger.info(f"Has SQUARE_ACCESS_TOKEN: {'Yes' if os.getenv('SQUARE_ACCESS_TOKEN') else 'No'}")