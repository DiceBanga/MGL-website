from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uuid

# Create a router without prefix for clearer debugging
router = APIRouter()

class PaymentRequest(BaseModel):
    sourceId: str
    amount: float
    idempotencyKey: Optional[str] = None
    note: Optional[str] = None
    referenceId: Optional[str] = None

@router.post("/api/payments")
async def create_payment(request: PaymentRequest):
    try:
        # Import here to avoid circular imports
        from main import payment_service
        
        # Ensure we have an idempotency key
        idempotency_key = request.idempotencyKey or str(uuid.uuid4())
        
        # Use the payment service
        result = await payment_service.process_payment({
            "source_id": request.sourceId,
            "amount": request.amount,
            "idempotency_key": idempotency_key,
            "note": request.note,
            "reference_id": request.referenceId
        })
        
        return {"payment": result}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 