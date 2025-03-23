from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
import json
import logging
import re
import uuid

from ..services.request_service import RequestService
from ..dependencies import get_request_service

router = APIRouter()
logger = logging.getLogger(__name__)

class WebhookPayload(BaseModel):
    type: str
    data: Dict[str, Any]

# Helper function to extract request ID from reference format
def extract_request_id_from_reference(reference_id: str) -> str:
    """
    Extracts the original request UUID from our reference ID format
    Format examples:
    1. New format: "1002-98ddd206fe9b46c79e562625080a86fb"
    2. Legacy date format: "03222025-1002-aab75524-ecac78cd-98ddd206"
    """
    if not reference_id:
        return None
        
    # Handle new format: "itemId-shortRequestId"
    parts = reference_id.split('-')
    if len(parts) == 2:
        short_id = parts[1]
        # Check if it's a hex string of the right length
        if len(short_id) == 32 and all(c in '0123456789abcdefABCDEF' for c in short_id):
            # Reconstruct UUID format
            reconstructed = f"{short_id[0:8]}-{short_id[8:12]}-{short_id[12:16]}-{short_id[16:20]}-{short_id[20:]}"
            try:
                # Validate it's a proper UUID
                uuid_obj = uuid.UUID(reconstructed)
                return str(uuid_obj)
            except ValueError:
                pass
    
    # If we can't extract it as our format, see if it's already a UUID
    try:
        uuid_obj = uuid.UUID(reference_id)
        return str(uuid_obj)
    except ValueError:
        pass
        
    return None

async def process_request_update(request_id: str, status: str, webhook_data: Dict[str, Any], request_service: RequestService):
    """
    Background task to process request updates from webhooks
    """
    try:
        payment_id = webhook_data.get("data", {}).get("object", {}).get("payment", {}).get("id", "unknown")
        logger.info(f"Processing payment {payment_id} webhook for request {request_id} with status {status}")
        
        # Get the request details
        request = await request_service.get_request(request_id)
        
        if not request:
            logger.error(f"Request with ID {request_id} not found")
            return
        
        # Update the payment_id field in the request if it's null but we have a payment_reference
        if request.get('payment_reference') and not request.get('payment_id'):
            try:
                await request_service.supabase.table("team_change_requests").update({
                    "payment_id": payment_id
                }).eq("id", request_id).execute()
                logger.info(f"Updated payment_id for request {request_id} to {payment_id}")
            except Exception as e:
                logger.error(f"Error updating payment_id: {str(e)}")
        
        # Update request status
        await request_service._update_request_status(
            request_id,
            status,
            {
                "webhook_processed": True,
                "webhook_data": webhook_data,
                "payment_id": payment_id
            }
        )
        
        # If payment was successful, execute the action
        if status == 'approved' and request.get('status') == 'pending':
            logger.info(f"Payment approved for request {request_id}, executing action: {request.get('request_type')}")
            
            # Convert request to request_data format expected by execute_action
            request_data = {
                "request_id": request_id,
                "request_type": request.get('request_type'),
                "team_id": request.get('team_id'),
                "requested_by": request.get('requested_by')
            }
            
            # Add request type specific fields
            metadata = request.get('metadata', {})
            
            if request.get('request_type') == 'team_transfer':
                request_data["new_captain_id"] = request.get('new_value') or metadata.get('new_captain_id') or metadata.get('newCaptainId')
                request_data["old_captain_id"] = request.get('old_value') or metadata.get('old_captain_id') or metadata.get('oldCaptainId')
                logger.info(f"Team Transfer: from {request_data['old_captain_id']} to {request_data['new_captain_id']}")
                
            elif request.get('request_type') == 'roster_change':
                request_data["player_id"] = request.get('player_id') or metadata.get('player_id') or metadata.get('playerId')
                request_data["new_role"] = request.get('new_value') or metadata.get('new_role') or metadata.get('role', 'player')
                request_data["operation"] = metadata.get('operation', 'add')
                logger.info(f"Roster Change: Player {request_data['player_id']} - Operation: {request_data['operation']}")
                
            elif request.get('request_type') == 'tournament_registration':
                request_data["tournament_id"] = request.get('tournament_id') or metadata.get('tournament_id') or metadata.get('tournamentId')
                request_data["player_ids"] = metadata.get('player_ids', []) or metadata.get('playersIds', [])
                logger.info(f"Tournament Registration: Tournament {request_data['tournament_id']} with {len(request_data['player_ids'])} players")
                
            elif request.get('request_type') == 'league_registration':
                request_data["league_id"] = request.get('league_id') or metadata.get('league_id') or metadata.get('leagueId')
                request_data["season"] = metadata.get('season', 1)
                request_data["player_ids"] = metadata.get('player_ids', []) or metadata.get('playersIds', [])
                logger.info(f"League Registration: League {request_data['league_id']} Season {request_data['season']} with {len(request_data['player_ids'])} players")
                
            elif request.get('request_type') == 'team_rebrand':
                request_data["old_name"] = request.get('old_value') or metadata.get('old_name') or metadata.get('oldName')
                request_data["new_name"] = request.get('new_value') or metadata.get('new_name') or metadata.get('newName')
                logger.info(f"Team Rebrand: from {request_data.get('old_name', 'Unknown')} to {request_data['new_name']}")
                
            elif request.get('request_type') == 'online_id_change':
                request_data["player_id"] = request.get('player_id') or metadata.get('player_id') or metadata.get('playerId')
                request_data["old_online_id"] = request.get('old_value') or metadata.get('old_online_id') or metadata.get('oldOnlineId')
                request_data["new_online_id"] = request.get('new_value') or metadata.get('new_online_id') or metadata.get('newOnlineId')
                request_data["platform"] = metadata.get('platform', 'psn')
                logger.info(f"Online ID Change: Player {request_data['player_id']} - Platform: {request_data['platform']}")
                
            elif request.get('request_type') == 'team_creation':
                request_data["team_name"] = request.get('new_value') or metadata.get('team_name') or metadata.get('teamName')
                request_data["captain_id"] = request.get('requested_by') or metadata.get('captain_id') or metadata.get('captainId')
                request_data["league_id"] = request.get('league_id') or metadata.get('league_id') or metadata.get('leagueId')
                logger.info(f"Team Creation: {request_data['team_name']} with captain {request_data['captain_id']}")
            
            # Check if we have all required fields
            missing_fields = []
            if request.get('request_type') == 'team_transfer' and (not request_data.get('new_captain_id') or not request_data.get('team_id')):
                missing_fields.append('new_captain_id or team_id')
            elif request.get('request_type') == 'roster_change' and not request_data.get('player_id'):
                missing_fields.append('player_id')
            elif request.get('request_type') == 'tournament_registration' and not request_data.get('tournament_id'):
                missing_fields.append('tournament_id')
            elif request.get('request_type') == 'league_registration' and not request_data.get('league_id'):
                missing_fields.append('league_id')
            elif request.get('request_type') == 'team_rebrand' and not request_data.get('new_name'):
                missing_fields.append('new_name')
            elif request.get('request_type') == 'online_id_change' and (not request_data.get('player_id') or not request_data.get('new_online_id')):
                missing_fields.append('player_id or new_online_id')
            elif request.get('request_type') == 'team_creation' and (not request_data.get('team_name') or not request_data.get('captain_id')):
                missing_fields.append('team_name or captain_id')
            
            if missing_fields:
                error_message = f"Missing required fields for {request.get('request_type')}: {', '.join(missing_fields)}"
                logger.error(error_message)
                await request_service._update_request_status(
                    request_id, 
                    "failed", 
                    {"error": error_message}
                )
                return
            
            # Execute the action
            try:
                logger.info(f"Executing action for request {request_id}: {request.get('request_type')}")
                result = await request_service._execute_action(request_data, None)
                logger.info(f"Action executed successfully: {result}")
                await request_service._update_request_status(request_id, "completed", result)
            except Exception as e:
                logger.error(f"Error executing action for request {request_id}: {str(e)}")
                await request_service._update_request_status(
                    request_id, 
                    "failed", 
                    {"error": str(e)}
                )
        else:
            logger.info(f"No action needed for request {request_id} with status {request.get('status')} and payment status {status}")
        
    except Exception as e:
        logger.error(f"Error processing webhook for request {request_id}: {str(e)}")
        # Update request with error
        try:
            await request_service.supabase.table("team_change_requests").update({
                "status": "failed",
                "last_error": str(e),
                "processing_attempts": request.get('processing_attempts', 0) + 1
            }).eq("id", request_id).execute()
        except Exception as update_error:
            logger.error(f"Failed to update request status: {str(update_error)}")

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
        
        # Log the webhook payload type and ID
        webhook_id = payload.get("event_id", "unknown")
        logger.info(f"Received Square webhook: {payload['type']} (ID: {webhook_id})")
        
        # Verify webhook is a payment update
        if payload["type"] != "payment.updated":
            logger.info(f"Ignoring non-payment webhook type: {payload['type']}")
            return {"status": "success", "message": "Webhook received but not processed (not a payment update)"}
        
        # Get payment data
        payment_data = payload["data"]["object"]["payment"]
        payment_id = payment_data.get("id", "unknown")
        payment_status = payment_data.get("status", "unknown")
        
        logger.info(f"Processing Square webhook for payment {payment_id} with status: {payment_status}")
        
        # Check if this is a payment for a team request
        reference_id = payment_data.get("reference_id")
        
        # Try to get request_id from different places (for backward compatibility)
        request_id = None
        reference_source = "none"
        
        # 1. First check if reference_id can be parsed with our helper function
        extracted_id = extract_request_id_from_reference(reference_id)
        if extracted_id:
            request_id = extracted_id
            reference_source = "extracted_from_reference"
            logger.info(f"Extracted request_id from payment reference_id: {request_id}")
        
        # 2. Check payment metadata
        elif payment_data.get("metadata"):
            metadata = payment_data.get("metadata", {})
            if metadata.get("request_id"):
                request_id = metadata.get("request_id")
                reference_source = "metadata.request_id"
                logger.info(f"Found request_id in payment metadata: {request_id}")
            # Also check nested under application_details if present
            elif metadata.get("application_details") and metadata.get("application_details", {}).get("request_id"):
                request_id = metadata.get("application_details", {}).get("request_id")
                reference_source = "metadata.application_details.request_id"
                logger.info(f"Found request_id in application_details: {request_id}")
        
        # 3. Check note field for request ID
        if not request_id and payment_data.get("note"):
            note = payment_data.get("note", "")
            # Try to extract UUID pattern from note
            uuid_pattern = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
            uuid_matches = re.findall(uuid_pattern, note, re.IGNORECASE)
            if uuid_matches:
                request_id = uuid_matches[0]
                reference_source = "note_uuid_pattern"
                logger.info(f"Extracted request_id from note using UUID pattern: {request_id}")
        
        # 4. Check for team change request with this payment_id as payment_reference
        if not request_id:
            try:
                payment_ref_result = await request_service.supabase.table("team_change_requests").select("id").eq("payment_reference", payment_id).execute()
                if payment_ref_result.data and len(payment_ref_result.data) > 0:
                    request_id = payment_ref_result.data[0]["id"]
                    reference_source = "team_change_requests.payment_reference"
                    logger.info(f"Found request via payment_reference lookup: {request_id}")
            except Exception as e:
                logger.error(f"Error looking up request by payment_reference: {str(e)}")
        
        if not request_id:
            logger.warning(f"Webhook received for payment {payment_id} but could not determine request ID.")
            return {"status": "success", "message": "Payment processed but no related request found"}
        
        logger.info(f"Webhook for payment {payment_id} mapped to request {request_id} (source: {reference_source})")
        
        # Check if payment was successful
        if payment_status == "COMPLETED":
            logger.info(f"Payment {payment_id} COMPLETED for request {request_id}")
            
            # Schedule the request processing in the background
            background_tasks.add_task(
                process_request_update,
                request_id,
                "approved",
                payload,
                request_service
            )
            
            return {"status": "success", "message": f"Payment {payment_id} completed, processing request {request_id}"}
            
        elif payment_status in ["FAILED", "CANCELED"]:
            logger.info(f"Payment {payment_id} {payment_status} for request {request_id}")
            
            # Mark the request as failed
            background_tasks.add_task(
                process_request_update,
                request_id,
                "failed",
                payload,
                request_service
            )
            
            return {"status": "success", "message": f"Payment {payment_id} {payment_status.lower()}, marking request {request_id} as failed"}
        
        else:
            logger.info(f"Payment {payment_id} has status {payment_status}, no action taken for request {request_id}")
            return {"status": "success", "message": f"Payment status {payment_status} does not require action"}
        
    except Exception as e:
        logger.error(f"Error processing Square webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}") 