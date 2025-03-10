from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a fresh FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple model for testing
class TestPayment(BaseModel):
    amount: float
    note: str = None

# Root endpoint
@app.get("/")
def root():
    logger.info("Root endpoint called")
    return {"message": "Hello World"}

# Simple post endpoint
@app.post("/simple-payment")
def simple_payment(payment: TestPayment):
    logger.info(f"Payment received: {payment}")
    return {"success": True, "amount": payment.amount, "note": payment.note}

# Print out routes for debugging
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up test FastAPI application...")
    routes = [f"{route.path} [{route.name}]" for route in app.routes]
    logger.info(f"Available routes: {routes}")

# Run this with: uvicorn test_server:app --reload 