from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from app.dependencies import get_payment_service
from app.services.payment_service import PaymentService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/square")
async def square_webhook(request: Request, background_tasks: BackgroundTasks, payment_service: PaymentService = Depends(get_payment_service)):
    """Handle Square payment webhooks"""
    try:
        # Get the raw body for signature verification
        body = await request.body()
        
        # Get the signature header
        signature = request.headers.get('X-Square-Signature')
        
        # Parse the webhook data
        webhook_data = await request.json()
        
        # Verify the webhook is authentic
        # (this should be implemented in the payment service)
        is_valid = await payment_service.verify_webhook_signature(signature, body)
        
        if not is_valid:
            logger.error("Invalid Square webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Process the webhook in the background
        background_tasks.add_task(payment_service.process_payment_webhook, webhook_data)
        
        # Always return 200 to acknowledge receipt, even if processing fails
        return {"status": "received"}
    except Exception as e:
        logger.exception(f"Error processing Square webhook: {str(e)}")
        # Still return 200 to prevent retries, but log the error
        return {"status": "error", "message": str(e)} 