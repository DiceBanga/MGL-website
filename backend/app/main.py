from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from app.dependencies import get_request_service, get_payment_service
from app.services.request_service import RequestService
from app.services.payment_service import PaymentService
from app.routes import team, league, tournament, webhook, auth, player, team_request

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(team.router, prefix="/api/team", tags=["team"])
app.include_router(league.router, prefix="/api/league", tags=["league"])
app.include_router(tournament.router, prefix="/api/tournament", tags=["tournament"])
app.include_router(webhook.router, prefix="/api/webhook", tags=["webhook"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(player.router, prefix="/api/player", tags=["player"])
app.include_router(team_request.router, prefix="/api/request", tags=["request"])

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        # Initialize the request service
        request_service = await get_request_service()
        logger.info("Request service initialized")
        
        # Initialize the payment service
        payment_service = await get_payment_service()
        logger.info("Payment service initialized")
    except Exception as e:
        logger.exception(f"Error initializing services: {str(e)}")
        # Continue startup even if service initialization fails
        # This allows the app to start and potentially recover

@app.get("/api/healthcheck")
async def healthcheck():
    """Simple health check endpoint"""
    return {"status": "healthy"} 