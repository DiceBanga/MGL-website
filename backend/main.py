from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from square.client import Client
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from database import get_supabase
from services.payment_service import PaymentService

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Square client
client = Client(
    access_token=os.getenv('SQUARE_ACCESS_TOKEN'),
    environment=os.getenv('SQUARE_ENVIRONMENT')
)

# Initialize payment service
payment_service = PaymentService(
    square_client=client,
    supabase=get_supabase(),
    square_location_id=os.getenv('SQUARE_LOCATION_ID'),
    square_app_id=os.getenv('SQUARE_APP_ID')
)

class PaymentRequest(BaseModel):
    sourceId: str
    amount: float
    idempotencyKey: str
    note: str = None
    referenceId: str = None

@app.post("/api/payments/create")
async def create_payment(payment: PaymentRequest):
    try:
        result = await payment_service.process_payment({
            "source_id": payment.sourceId,
            "amount": payment.amount,
            "idempotency_key": payment.idempotencyKey,
            "note": payment.note,
            "reference_id": payment.referenceId
        })
        
        return {"payment": result}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))