from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
import json
import logging

from ..services.request_service import RequestService
from ..dependencies import get_request_service

router = APIRouter()
logger = logging.getLogger(__name__)

class WebhookPayload(BaseModel):
    type: str
    data: Dict[str, Any]

async def process_request_update(request_id: str, status: str, webhook_data: Dict[str, Any], request_service: RequestService):
    """
    Background task to process request updates from webhooks
    """
    try:
        logger.info(f"Processing webhook update for request {request_id} with status {status}")
        
        # Get the request details
        request = await request_service.get_request(request_id)
        
        if not request:
            logger.error(f"Request with ID {request_id} not found")
            return
        
        # Update request status
        await request_service._update_request_status(
            request_id,
            status,
            {
                "webhook_processed": True,
                "webhook_data": webhook_data
            }
        )
        
        # If payment was successful, execute the action
        if status == 'approved' and request.get('status') == 'pending':
            # Convert request to request_data format expected by execute_action
            request_data = {
                "request_id": request_id,
                "request_type": request.get('request_type'),
                "team_id": request.get('team_id'),
                "requested_by": request.get('requested_by')
            }
            
            # Add request type specific fields
            if request.get('request_type') == 'team_transfer':
                request_data["new_captain_id"] = request.get('new_value')
                request_data["old_captain_id"] = request.get('old_value')
            elif request.get('request_type') == 'roster_change':
                request_data["player_id"] = request.get('player_id')
                request_data["new_role"] = request.get('new_value')
                request_data["operation"] = request.get('metadata', {}).get('operation', 'update')
            elif request.get('request_type') == 'tournament_registration':
                request_data["tournament_id"] = request.get('tournament_id')
                request_data["player_ids"] = request.get('metadata', {}).get('player_ids', [])
            elif request.get('request_type') == 'league_registration':
                request_data["league_id"] = request.get('league_id')
                request_data["season"] = request.get('metadata', {}).get('season', 1)
                request_data["player_ids"] = request.get('metadata', {}).get('player_ids', [])
            
            # Execute the action
            try:
                await request_service._execute_action(request_data, None)
                await request_service._update_request_status(request_id, "completed")
            except Exception as e:
                logger.error(f"Error executing action for request {request_id}: {str(e)}")
                await request_service._update_request_status(
                    request_id, 
                    "failed", 
                    {"error": str(e)}
                )
        
    except Exception as e:
        logger.error(f"Error processing webhook for request {request_id}: {str(e)}")
        # Update request with error
        await request_service.supabase.table("team_change_requests").update({
            "status": "failed",
            "last_error": str(e),
            "processing_attempts": request.get('processing_attempts', 0) + 1
        }).eq("id", request_id).execute()

@router.post("/square")
async def handle_square_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    request_service: RequestService = Depends(get_request_service)
):
    """
    Handle Square payment webhooks
    """
    try:
        # Get the raw payload
        payload_bytes = await request.body()
        payload_str = payload_bytes.decode('utf-8')
        payload = json.loads(payload_str)
        
        # Log the webhook payload
        logger.info(f"Received Square webhook: {payload['type']}")
        
        # Verify webhook is a payment update
        if payload["type"] != "payment.updated":
            return {"status": "success", "message": "Webhook received but not processed (not a payment update)"}
        
        # Get payment data
        payment_data = payload["data"]["object"]["payment"]
        
        # Check if this is a payment for a team request
        reference_id = payment_data.get("reference_id")
        
        if not reference_id:
            return {"status": "success", "message": "Webhook received but not processed (no reference ID)"}
        
        # Check if payment was approved
        status = payment_data.get("status")
        
        if status == "COMPLETED":
            # Schedule the request processing in the background
            background_tasks.add_task(
                process_request_update,
                reference_id,
                "approved",
                payload,
                request_service
            )
        elif status in ["FAILED", "CANCELED"]:
            # Mark the request as failed
            background_tasks.add_task(
                process_request_update,
                reference_id,
                "failed",
                payload,
                request_service
            )
        
        return {"status": "success", "message": "Webhook processed successfully"}
        
    except Exception as e:
        logger.error(f"Error processing Square webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}") 