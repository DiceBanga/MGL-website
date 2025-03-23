from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging
import uuid
import json
import os
from datetime import datetime

# Import the payment service
from ..services.payment_service import PaymentService
from ..dependencies import get_request_service

router = APIRouter()
logger = logging.getLogger(__name__)

class PaymentRequest(BaseModel):
    sourceId: str
    amount: float
    idempotencyKey: str = None
    note: str = None
    referenceId: str = None

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

@router.post("/payments/test")
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

@router.post("/payments/process")
async def payments_process(request: PaymentRequest):
    """Legacy process endpoint - redirects to main /api/payments endpoint"""
    logger.warning("Deprecated /api/payments/process endpoint accessed, please use /api/payments instead")
    return await create_payment(request) 