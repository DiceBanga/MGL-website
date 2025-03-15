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

@router.post("/payments")
async def create_payment(request: PaymentRequest):
    try:
        # Import here to avoid circular imports
        from main import payment_service
        
        # Log the incoming request details
        print("Payment request details:", {
            "source_id": request.sourceId,
            "amount": request.amount,
            "idempotency_key": request.idempotencyKey,
            "note": request.note,
            "reference_id": request.referenceId,
            "reference_id_length": len(request.referenceId) if request.referenceId else 0
        })
        
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
        
        # Format response for frontend compatibility
        return {
            "success": True,
            "payment": {
                "id": result.get("id", "unknown"),
                "status": result.get("status", "COMPLETED"),
                "receiptUrl": result.get("receipt_url", None),
                "amount": request.amount,
                "created_at": result.get("created_at", None),
                "card_details": result.get("card_details", {})
            }
        }
            
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail={
                "success": False,
                "message": "Payment processing failed",
                "error": str(e)
            }
        ) 