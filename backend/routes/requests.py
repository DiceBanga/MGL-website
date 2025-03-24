from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import uuid

# Import the dependency to get the RequestService
from dependencies import get_request_service
from services.request_service import RequestService

router = APIRouter()

class RequestBase(BaseModel):
    request_type: str
    team_id: str
    requested_by: str
    requires_payment: bool = False
    metadata: Optional[Dict[str, Any]] = None

class TeamTransferRequest(RequestBase):
    request_type: str = "team_transfer"
    new_captain_id: str
    old_captain_id: str
    payment_data: Optional[Dict[str, Any]] = None

class RosterChangeRequest(RequestBase):
    request_type: str = "roster_change"
    player_id: str
    new_role: Optional[str] = None
    operation: str = "update"  # "add", "remove", "update"
    payment_data: Optional[Dict[str, Any]] = None

class TournamentRegistrationRequest(RequestBase):
    request_type: str = "tournament_registration"
    tournament_id: str
    player_ids: List[str]
    payment_data: Optional[Dict[str, Any]] = None

class LeagueRegistrationRequest(RequestBase):
    request_type: str = "league_registration"
    league_id: str
    season: Optional[int] = None
    player_ids: List[str]
    payment_data: Optional[Dict[str, Any]] = None

class TeamRebrandRequest(RequestBase):
    request_type: str = "team_rebrand"
    old_name: str
    new_name: str
    payment_data: Optional[Dict[str, Any]] = None

class OnlineIdChangeRequest(RequestBase):
    request_type: str = "online_id_change"
    player_id: str
    old_online_id: Optional[str] = None
    new_online_id: str
    platform: str
    payment_data: Optional[Dict[str, Any]] = None

class TeamCreationRequest(RequestBase):
    request_type: str = "team_creation"
    team_name: str
    captain_id: str
    league_id: Optional[str] = None
    payment_data: Optional[Dict[str, Any]] = None

@router.post("/team/transfer", response_model=Dict[str, Any])
async def transfer_team(
    request: TeamTransferRequest,
    request_service: RequestService = Depends(get_request_service)
):
    try:
        result = await request_service.process_request(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/team/roster", response_model=Dict[str, Any])
async def update_roster(
    request: RosterChangeRequest,
    request_service: RequestService = Depends(get_request_service)
):
    try:
        result = await request_service.process_request(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tournament/register", response_model=Dict[str, Any])
async def register_tournament(
    request: TournamentRegistrationRequest,
    request_service: RequestService = Depends(get_request_service)
):
    try:
        result = await request_service.process_request(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/league/register", response_model=Dict[str, Any])
async def register_league(
    request: LeagueRegistrationRequest,
    request_service: RequestService = Depends(get_request_service)
):
    try:
        result = await request_service.process_request(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/team/rebrand", response_model=Dict[str, Any])
async def rebrand_team(
    request: TeamRebrandRequest,
    request_service: RequestService = Depends(get_request_service)
):
    try:
        result = await request_service.process_request(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/team/online-id", response_model=Dict[str, Any])
async def change_online_id(
    request: OnlineIdChangeRequest,
    request_service: RequestService = Depends(get_request_service)
):
    try:
        result = await request_service.process_request(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/team/create", response_model=Dict[str, Any])
async def create_team(
    request: TeamCreationRequest,
    request_service: RequestService = Depends(get_request_service)
):
    try:
        result = await request_service.process_request(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/requests/{request_id}", response_model=Dict[str, Any])
async def get_request(
    request_id: str,
    request_service: RequestService = Depends(get_request_service)
):
    try:
        request = await request_service.get_request(request_id)
        
        if not request:
            raise HTTPException(status_code=404, detail=f"Request with ID {request_id} not found")
            
        return request
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/team/{team_id}/requests", response_model=List[Dict[str, Any]])
async def get_team_requests(
    team_id: str,
    status: Optional[str] = None,
    request_service: RequestService = Depends(get_request_service)
):
    try:
        # Build query
        query = request_service.supabase.table("team_change_requests").select("*").eq("team_id", team_id)
        
        # Add status filter if provided
        if status:
            query = query.eq("status", status)
            
        # Execute query
        result = await query.order("created_at", desc=True).execute()
        
        if hasattr(result, 'error') and result.error is not None:
            raise Exception(f"Failed to get team requests: {result.error}")
            
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 