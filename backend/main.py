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
from supabase import create_client, Client as SupabaseClient
import pathlib

# Import routes
from routes.payments import router as payments_router
from routes.requests import router as requests_router
from routes.webhooks import router as webhooks_router

# Import services
from services.payment_service import PaymentService

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from the correct location
current_file = pathlib.Path(__file__).resolve()
backend_dir = current_file.parent
env_path = backend_dir / '.env'

print(f"Looking for .env file at: {env_path}")
if env_path.exists():
    print(f".env file found at {env_path}")
    load_dotenv(dotenv_path=env_path)
else:
    print(f".env file NOT found at {env_path}, trying alternative locations")
    # Try alternative locations
    alt_paths = [
        pathlib.Path.cwd() / '.env',
        pathlib.Path.cwd().parent / '.env',
    ]
    for path in alt_paths:
        print(f"Checking for .env at: {path}")
        if path.exists():
            print(f".env file found at {path}")
            load_dotenv(dotenv_path=path)
            break

# Log environment variables
logger.debug(f"SUPABASE_URL: {os.environ.get('SUPABASE_URL')}")
logger.debug(f"SUPABASE_ANON_KEY: {os.environ.get('SUPABASE_ANON_KEY') and 'Set (hidden)' or 'Not set'}")

# Global clients
square_client = Client(
    access_token=os.environ.get('SQUARE_ACCESS_TOKEN'),
    environment=os.environ.get('SQUARE_ENVIRONMENT', 'sandbox')
)

# Create Supabase client with error handling
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_ANON_KEY')

if not supabase_url or not supabase_key:
    logger.error("Supabase environment variables not set")
    logger.error(f"ENV path tried: {env_path}, exists: {env_path.exists()}")
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set")

supabase_client = create_client(supabase_url, supabase_key)

# Create global payment service
payment_service = PaymentService(
    square_client=square_client,
    supabase=supabase_client,
    square_location_id=os.environ.get('SQUARE_LOCATION_ID'),
    square_app_id=os.environ.get('SQUARE_APP_ID')
)

app = FastAPI(
    title="MGL API",
    description="API for team management, payments, and registrations",
    version="1.0.0",
    debug=True
)

# ------------- CORS CONFIGURATION -------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
# ------------- END CORS CONFIGURATION -------------

# Include routers
app.include_router(payments_router, prefix="/api", tags=["payments"])
app.include_router(requests_router, prefix="/api", tags=["requests"])
app.include_router(webhooks_router, prefix="/api/webhook", tags=["webhooks"])

# Add a compatibility route for direct /payments access
@app.post("/payments")
async def direct_payments_route(request: Request):
    """
    Compatibility endpoint to handle direct /payments requests
    by forwarding them to the /api/payments route
    """
    logger.info("Direct /payments endpoint accessed, forwarding to /api/payments")
    
    # Get the raw request body
    body = await request.body()
    
    # Forward to the proper route handler
    from routes.payments import create_payment, PaymentRequest
    from fastapi.encoders import jsonable_encoder
    
    # Parse the request body
    try:
        data = json.loads(body)
        payment_request = PaymentRequest(**data)
        return await create_payment(payment_request, request)
    except Exception as e:
        logger.error(f"Error forwarding payment request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": f"Payment processing error: {str(e)}"}
        )

# ------------- HEALTH CHECK ENDPOINTS -------------
@app.get("/")
def root():
    """Root endpoint providing API information"""
    return {
        "name": "MGL API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "payments": "/api/payments",
            "requests": "/api/team/transfer, /api/team/roster, /api/team/rebrand, /api/team/online-id, /api/team/create, /api/tournament/register, /api/league/register",
            "webhooks": "/api/webhook/square",
            "health": "/ping",
            "debug": "/debug"
        }
    }

@app.get("/ping")
def ping():
    """Health check endpoint"""
    logger.info("Health check ping received")
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "id": str(uuid.uuid4())
    }
# ------------- END HEALTH CHECK ENDPOINTS -------------

# ------------- MODELS -------------
class PaymentRequest(BaseModel):
    sourceId: str
    amount: float
    idempotencyKey: str = None
    note: str = None
    referenceId: str = None
# ------------- END MODELS -------------

# ------------- PAYMENT ENDPOINTS -------------
@app.post("/api/payments")
async def create_payment(request: PaymentRequest):
    """Main payment processing endpoint"""
    logger.info(f"Payment request received: {request}")
    
    try:
        # Log environment variables for debugging
        logger.info(f"SQUARE_ENVIRONMENT: {os.getenv('SQUARE_ENVIRONMENT')}")
        logger.info(f"SQUARE_LOCATION_ID: {os.getenv('SQUARE_LOCATION_ID')}")
        
        # Check for access token without logging the full token (security)
        access_token = os.getenv('SQUARE_ACCESS_TOKEN')
        if not access_token:
            logger.error("SQUARE_ACCESS_TOKEN is missing")
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Square API configuration error",
                    "error": "Missing access token"
                }
            )
        
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
        
        # Create Square client for this request
        client = Client(
            access_token=access_token,
            environment=os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
        )
        
        logger.info("Calling Square API to create payment")
        result = client.payments.create_payment(body)
        
        if result.is_success():
            payment = result.body["payment"]
            logger.info(f"Payment successful! ID: {payment['id']}")
            
            # Return the payment details
            return {"payment": payment}
        else:
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
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Exception in payment processing: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Internal server error during payment processing",
                "error": str(e)
            }
        )

@app.post("/api/payments/test")
async def test_payment(payment: PaymentRequest):
    """Test endpoint that simulates payment processing without making real API calls"""
    logger.info("=========== TEST PAYMENT REQUEST ===========")
    logger.info(f"Payment source ID: {payment.sourceId}")
    logger.info(f"Amount: {payment.amount}")
    logger.info(f"Idempotency key: {payment.idempotencyKey}")
    logger.info(f"Note: {payment.note}")
    logger.info(f"Reference ID: {payment.referenceId}")
    logger.info("============================================")
    
    # Return mock success response
    return {
        "success": True,
        "message": "Test payment processed successfully",
        "payment": {
            "id": f"test-{payment.idempotencyKey or uuid.uuid4()}",
            "created_at": datetime.now().isoformat(),
            "status": "APPROVED",
            "amount_money": {
                "amount": int(payment.amount * 100),
                "currency": "USD"
            },
            "card_details": {
                "card": {
                    "last_4": "1111",
                    "card_brand": "VISA",
                    "exp_month": 12,
                    "exp_year": 2025
                }
            }
        }
    }

# ------------- LEGACY ENDPOINTS -------------
@app.post("/api/payments/process")
async def payments_process(request: PaymentRequest):
    """Legacy process endpoint - redirects to main /api/payments endpoint"""
    logger.warning("Deprecated /api/payments/process endpoint accessed, please use /api/payments instead")
    return await create_payment(request)
# ------------- END LEGACY ENDPOINTS -------------

# ------------- DEBUG ENDPOINTS -------------
@app.get("/debug")
async def debug_info(request: Request):
    """Debug endpoint providing system and request information"""
    routes_info = [
        {
            "path": getattr(route, "path", ""),
            "name": getattr(route, "name", ""),
            "methods": list(getattr(route, "methods", set()))
        }
        for route in app.routes
    ]
    
    return {
        "request": {
            "url": str(request.url),
            "base_url": str(request.base_url),
            "path": request.url.path,
            "method": request.method,
            "headers": dict(request.headers)
        },
        "environment": {
            "square_environment": os.getenv('SQUARE_ENVIRONMENT'),
            "has_location_id": bool(os.getenv('SQUARE_LOCATION_ID')),
            "has_access_token": bool(os.getenv('SQUARE_ACCESS_TOKEN'))
        },
        "routes": routes_info
    }
# ------------- END DEBUG ENDPOINTS -------------

# ------------- STARTUP EVENT -------------
@app.on_event("startup")
async def startup_event():
    """Log important information on startup"""
    logger.info("Starting Square Payment API...")
    
    # Log registered routes
    routes = []
    for route in app.routes:
        path = getattr(route, "path", "")
        methods = getattr(route, "methods", set())
        routes.append(f"{path} [{','.join(methods)}]")
    
    logger.info("Registered routes:")
    for route in routes:
        logger.info(f"  {route}")
    
    # Log environment status
    logger.info(f"SQUARE_ENVIRONMENT: {os.getenv('SQUARE_ENVIRONMENT')}")
    logger.info(f"Has SQUARE_LOCATION_ID: {'Yes' if os.getenv('SQUARE_LOCATION_ID') else 'No'}")
    logger.info(f"Has SQUARE_ACCESS_TOKEN: {'Yes' if os.getenv('SQUARE_ACCESS_TOKEN') else 'No'}")
# ------------- END STARTUP EVENT -------------