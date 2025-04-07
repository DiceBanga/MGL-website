from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import logging
import uuid
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional

# Import the payment service
from services.payment_service import PaymentService
from dependencies import get_request_service

router = APIRouter()
logger = logging.getLogger(__name__)

class PaymentRequest(BaseModel):
    sourceId: str
    amount: float
    idempotencyKey: str = None
    note: str = None
    referenceId: str = None
    metadata: Optional[Dict[str, Any]] = None
    season: Optional[int] = None  # Add season number

@router.post("/payments")
async def create_payment(request: PaymentRequest, req: Request):
    print("[Backend] Received payment request with reference_id:", request.referenceId)
    print("[Backend] Received payment request with season:", getattr(request, 'season', 'N/A'))

    # Add season to metadata if not present
    if not request.metadata:
        request.metadata = {}
    if 'season' not in request.metadata or request.metadata['season'] is None:
        request.metadata['season'] = getattr(request, 'season', 1)
    try:
        # Import here to avoid circular imports
        from main import payment_service
        
        # Log the incoming request details
        logger.info("Payment request details: %s", {
            "source_id": request.sourceId,
            "amount": request.amount,
            "idempotency_key": request.idempotencyKey,
            "note": request.note,
            "reference_id": request.referenceId,
            "has_metadata": request.metadata is not None
        })
        
        # Extract metadata from request body if not in the model
        if request.metadata is None:
            try:
                # Try to get the full request body
                body = await req.json()
                if 'metadata' in body:
                    request.metadata = body['metadata']
                    logger.info("Found metadata in request body")
            except:
                logger.warning("Failed to extract metadata from request body")
                
        # Prepare payment data
        payment_data = {
            "source_id": request.sourceId,
            "amount": request.amount,
            "idempotency_key": request.idempotencyKey or str(uuid.uuid4()),
            "note": request.note,
            "reference_id": request.referenceId
        }
        
        # Add metadata to the payment if provided
        if request.metadata:
            payment_data["metadata"] = request.metadata
            logger.info("Added metadata to payment data")
            
        # Process the payment using the payment service
        try:
            result = await payment_service.process_payment(payment_data)
            return {"success": True, "payment": result}
        except Exception as e:
            logger.exception(f"Payment service error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail={"message": f"Payment processing error: {str(e)}"}
            )
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": f"Unexpected error: {str(e)}"}
        )

@router.post("/payments/test")
async def test_payment(request: PaymentRequest):
    """Test endpoint for payment processing without making real API calls"""
    logger.info(f"Test payment request received: {request.dict()}")
    
    # Generate a fake payment ID
    test_payment_id = f"TEST_{uuid.uuid4()}"
    
    return {
        "success": True,
        "payment": {
            "id": test_payment_id,
            "status": "COMPLETED",
            "amount_money": {
                "amount": int(request.amount * 100),
                "currency": "USD"
            },
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "receipt_url": f"https://squareupsandbox.com/receipt/preview/{test_payment_id}",
            "card_details": {
                "card": {
                    "last_4": "1111",
                    "card_brand": "VISA"
                }
            },
            "reference_id": request.referenceId,
            "source_id": request.sourceId
        }
    }

@router.post("/payments/process")
async def payments_process(request: PaymentRequest):
    """Legacy process endpoint - redirects to main /api/payments endpoint"""
    logger.warning("Deprecated /api/payments/process endpoint accessed, please use /api/payments instead")
    return await create_payment(request) 