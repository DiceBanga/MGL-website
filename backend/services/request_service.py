from supabase import Client as SupabaseClient
import logging
from datetime import datetime
import uuid
from typing import Dict, Any, Optional

# Import other services
from .payment_service import PaymentService

class RequestService:
    def __init__(self, 
                 supabase: SupabaseClient, 
                 payment_service: PaymentService):
        self.supabase = supabase
        self.payment_service = payment_service
        self.logger = logging.getLogger(__name__)
        
    async def process_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Central method to handle all types of requests with a consistent workflow
        """
        try:
            # Generate request ID if not provided
            request_id = request_data.get("request_id", str(uuid.uuid4()))
            request_data["request_id"] = request_id
            
            self.logger.info(f"Processing {request_data['request_type']} request with ID: {request_id}")
            
            # Validate request data
            self._validate_request_data(request_data)
            
            # Create initial request record with pending status
            self.logger.info(f"Creating request record for {request_data['request_type']}")
            await self._create_request_record(request_data)
            
            # Process payment if needed
            payment_result = None
            if request_data.get("requires_payment", False):
                self.logger.info(f"Request requires payment, processing payment for request {request_id}")
                try:
                    payment_result = await self._process_payment(request_data)
                    self.logger.info(f"Payment successful for request {request_id}, setting status to payment_complete.")
                    # Update status to indicate payment is done, ready for async execution
                    # Pass payment_result as part of the metadata update
                    await self._update_request_status(request_id, "payment_complete", {"payment_details": payment_result})
                    final_status = "payment_complete"
                except Exception as e:
                    self.logger.error(f"Payment processing error for request {request_id}: {str(e)}", exc_info=True)
                    # Ensure status is updated to payment_failed before raising
                    await self._update_request_status(request_id, "payment_failed", {"error": str(e)})
                    raise Exception(f"Payment failed: {str(e)}")
            else:
                # No payment required, set status to ready for execution
                self.logger.info(f"No payment required for request {request_id}, setting status to ready_for_execution.")
                await self._update_request_status(request_id, "ready_for_execution")
                final_status = "ready_for_execution"

            # Action execution is now handled asynchronously by the DB trigger/Edge Function
            # Return success indicating the request was accepted and is being processed
            return {
                "success": True,
                "request_id": request_id,
                "status": final_status # Indicate the status reached in this synchronous part
                # Optionally include payment_result if needed by frontend immediately
                # "payment_result": payment_result
            }
            
        except Exception as e:
            self.logger.error(f"Request processing error: {str(e)}", exc_info=True)
            
            # Update request record with failed status
            if "request_id" in request_data:
                await self._update_request_status(
                    request_data["request_id"], 
                    "failed", 
                    {"error": str(e)}
                )
                
            raise
    
    def _validate_request_data(self, request_data: Dict[str, Any]):
        """
        Validate the request data based on the request type
        """
        required_fields = ["request_type", "requested_by", "team_id"]
        
        for field in required_fields:
            if field not in request_data:
                raise ValueError(f"Missing required field: {field}")
                
        # Validate additional fields based on request type
        request_type = request_data["request_type"]
        
        if request_type == "team_transfer":
            if "new_captain_id" not in request_data:
                raise ValueError("Missing new_captain_id for team transfer request")
                
        elif request_type == "roster_change":
            if "player_id" not in request_data or "new_role" not in request_data:
                raise ValueError("Missing player_id or new_role for roster change request")
                
        elif request_type in ["tournament_registration", "league_registration"]:
            if "event_id" not in request_data or "player_ids" not in request_data:
                raise ValueError("Missing event_id or player_ids for registration request")
        
        elif request_type == "league_registration":
            if "season" not in request_data:
                raise ValueError("Missing season for registration request")        
                
        elif request_type == "team_rebrand":
            if "new_name" not in request_data:
                raise ValueError("Missing new_name for team rebrand request")
                
        elif request_type == "online_id_change":
            if "player_id" not in request_data or "new_online_id" not in request_data or "platform" not in request_data:
                raise ValueError("Missing player_id, new_online_id, or platform for online ID change request")
                
        elif request_type == "team_creation":
            if "team_name" not in request_data or "captain_id" not in request_data:
                raise ValueError("Missing team_name or captain_id for team creation request")
    
    async def _create_request_record(self, request_data: Dict[str, Any]):
        """
        Create a request record in the database
        """
        self.logger.info(f"Creating request record for {request_data['request_type']} with ID: {request_data['request_id']}")
        
        # Prepare metadata with all relevant fields
        metadata = request_data.get("metadata", {})
        
        # Include all request-specific fields in metadata for easier retrieval later
        for key, value in request_data.items():
            if key not in ["request_id", "team_id", "request_type", "requested_by", "status", "created_at", "metadata", "item_id"]:
                metadata[key] = value
        
        request_record = {
            "id": request_data["request_id"],
            "team_id": request_data["team_id"],
            "request_type": request_data["request_type"],
            "requested_by": request_data["requested_by"],
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "metadata": metadata
        }
        
        # Add item_id if provided
        if "item_id" in request_data:
            self.logger.info(f"Request includes item_id: {request_data['item_id']}")
            request_record["item_id"] = request_data["item_id"]
        else:
            self.logger.warning(f"Request missing item_id, which may be required: {request_data['request_id']}")
        
        # Add type-specific fields
        if request_data["request_type"] == "team_rebrand":
            request_record["old_value"] = request_data.get("old_name", "")
            request_record["new_value"] = request_data.get("new_name", "")
        
        elif request_data["request_type"] == "online_id_change":
            request_record["player_id"] = request_data.get("player_id", "")
            request_record["old_value"] = request_data.get("old_online_id", "")
            request_record["new_value"] = request_data.get("new_online_id", "")
        
        elif request_data["request_type"] == "team_creation":
            request_record["new_value"] = request_data.get("team_name", "")
            if request_data.get("league_id"):
                request_record["league_id"] = request_data["league_id"]
        
        elif request_data["request_type"] == "team_transfer":
            request_record["old_value"] = request_data.get("old_captain_id", "")
            request_record["new_value"] = request_data.get("new_captain_id", "")
        
        elif request_data["request_type"] == "roster_change":
            request_record["player_id"] = request_data.get("player_id", "")
            request_record["new_value"] = request_data.get("new_role", "")
        
        elif request_data["request_type"] == "tournament_registration":
            request_record["tournament_id"] = request_data.get("tournament_id", "")
        
        elif request_data["request_type"] == "league_registration":
            request_record["league_id"] = request_data.get("league_id", "")
            request_record["season"] = request_data.get("season", 1)

        
        # Insert into team_change_requests table
        try:
            self.logger.info(f"Inserting request record: {request_record}")
            
            # Create the query but don't await it
            insert_query = self.supabase.table("team_change_requests").insert(request_record)
            
            # Execute the query without awaiting it
            response = insert_query.execute()
            
            # Check for errors in the response
            if hasattr(response, 'error') and response.error is not None:
                self.logger.error(f"Failed to create request record: {response.error}")
                raise Exception(f"Failed to create request record: {response.error}")
            
            self.logger.info(f"Successfully created request record with ID: {request_data['request_id']}")
            return response
        except Exception as e:
            self.logger.error(f"Error creating request record: {str(e)}", exc_info=True)
            raise
    
    async def _process_payment(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process payment for requests that require payment
        """
        if "payment_data" not in request_data:
            raise ValueError("Payment data is required for requests that require payment")
            
        payment_data = request_data["payment_data"]
        
        # Add request metadata to payment
        payment_data["reference_id"] = request_data["request_id"]
        payment_data["metadata"] = {
            **payment_data.get("metadata", {}),
            "request_id": request_data["request_id"],
            "request_type": request_data["request_type"],
            "team_id": request_data["team_id"]
        }
        
        # Add descriptive note based on request type
        request_type_names = {
            "team_transfer": "Team Ownership Transfer",
            "roster_change": "Team Roster Change",
            "tournament_registration": "Tournament Registration",
            "league_registration": "League Registration",
            "team_rebrand": "Team Name Change",
            "online_id_change": "Online ID Update",
            "team_creation": "New Team Creation"
        }
        
        payment_data["note"] = f"{request_type_names.get(request_data['request_type'], 'Team Action')} - ID: {request_data['request_id'][:8]}"
        
        # Log payment data for debugging
        self.logger.info(f"Processing payment for request {request_data['request_id']} with reference_id: {payment_data['reference_id']}")
        
        # If we don't have a source_id, create a pending payment record 
        # and return a payment URL for the frontend to use
        if not payment_data.get("source_id"):
            self.logger.info("No source_id provided, creating pending payment record only")
            
            pending_result = {
                "success": True,
                "status": "pending",
                "request_id": request_data["request_id"],
                "payment_url": f"/payment/{request_data['request_id']}?type={request_data['request_type']}&amount={payment_data.get('amount', 0)}"
            }
            
            # Still create a payment record in the database
            try:
                payment_record = {
                    "id": str(uuid.uuid4()),
                    "reference_id": request_data["request_id"],
                    "user_id": request_data["requested_by"],
                    "amount": payment_data.get("amount", 0),
                    "status": "pending",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "metadata": payment_data.get("metadata", {})
                }
                
                result = self.supabase.table("payments").insert(payment_record).execute()
                
                if hasattr(result, 'error') and result.error is not None:
                    self.logger.error(f"Failed to create payment record: {result.error}")
                else:
                    self.logger.info(f"Created pending payment record for request {request_data['request_id']}")
                    pending_result["payment_id"] = payment_record["id"]
            except Exception as e:
                self.logger.error(f"Error creating payment record: {str(e)}", exc_info=True)
            
            return pending_result
            
        # Process payment using payment service
        return await self.payment_service.process_payment(payment_data)
    
    async def _execute_action(self, request_data: Dict[str, Any], payment_result: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Execute the requested action based on request type
        """
        request_type = request_data["request_type"]
        
        # Only proceed if payment was successful or no payment required
        if request_data.get("requires_payment", False) and (payment_result is None or not payment_result.get("success", False)):
            raise Exception("Payment failed, cannot execute action")
        
        if request_type == "team_transfer":
            return await self._transfer_team_ownership(request_data)
            
        elif request_type == "roster_change":
            return await self._update_roster(request_data)
            
        elif request_type == "tournament_registration":
            return await self._register_for_tournament(request_data)
            
        elif request_type == "league_registration":
            return await self._register_for_league(request_data)
            
        elif request_type == "team_rebrand":
            return await self._rebrand_team(request_data)
            
        elif request_type == "online_id_change":
            return await self._update_online_id(request_data)
            
        elif request_type == "team_creation":
            return await self._create_team(request_data)
            
        else:
            raise ValueError(f"Unknown request type: {request_type}")
    
    async def _transfer_team_ownership(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transfer team ownership
        """
        team_id = request_data["team_id"]
        new_captain_id = request_data["new_captain_id"]
        old_captain_id = request_data.get("old_captain_id") or request_data.get("oldCaptainId")
        
        # Log detailed information for debugging
        self.logger.info(f"Transferring team ownership for team {team_id}")
        self.logger.info(f"Old captain: {old_captain_id}")
        self.logger.info(f"New captain: {new_captain_id}")
        
        # Call the admin_transfer_team_ownership function instead of transfer_team_ownership
        # This version doesn't rely on auth.uid() and can be called from webhooks
        result = await self.supabase.rpc(
            "admin_transfer_team_ownership",
            {
                "p_team_id": team_id, 
                "p_new_captain_id": new_captain_id,
                "p_old_captain_id": old_captain_id
            }
        ).execute()
        
        if hasattr(result, 'error') and result.error is not None:
            self.logger.error(f"Failed to transfer team ownership: {result.error}")
            raise Exception(f"Failed to transfer team ownership: {result.error}")
            
        self.logger.info(f"Team ownership transferred successfully for team {team_id}")
        return {"success": True, "team_id": team_id, "new_captain_id": new_captain_id}
    
    async def _update_roster(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update team roster (add/remove players, change roles)
        """
        team_id = request_data["team_id"]
        player_id = request_data["player_id"]
        new_role = request_data.get("new_role")
        
        # Handle different roster operations
        operation = request_data.get("operation", "update")
        
        if operation == "add":
            # Add player to team
            result = await self.supabase.table("team_players").insert({
                "team_id": team_id,
                "user_id": player_id,
                "role": new_role or "player",
                "can_be_deleted": True
            }).execute()
            
        elif operation == "remove":
            # Remove player from team
            result = await self.supabase.table("team_players").delete().eq("team_id", team_id).eq("user_id", player_id).execute()
            
        elif operation == "update":
            # Update player role
            result = await self.supabase.table("team_players").update({
                "role": new_role
            }).eq("team_id", team_id).eq("user_id", player_id).execute()
        
        if hasattr(result, 'error') and result.error is not None:
            raise Exception(f"Failed to update roster: {result.error}")
            
        return {"success": True, "team_id": team_id, "player_id": player_id, "operation": operation}
    
    async def _register_for_tournament(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Register team for tournament
        """
        team_id = request_data["team_id"]
        tournament_id = request_data["tournament_id"]
        player_ids = request_data["player_ids"]
        
        # Call the register_for_tournament function
        result = await self.supabase.rpc(
            "register_for_tournament",
            {
                "p_tournament_id": tournament_id,
                "p_team_id": team_id,
                "p_player_ids": player_ids
            }
        ).execute()
        
        if hasattr(result, 'error') and result.error is not None:
            raise Exception(f"Failed to register for tournament: {result.error}")
            
        return {
            "success": True,
            "team_id": team_id,
            "tournament_id": tournament_id,
            "registration_id": result.data
        }
    
    async def _register_for_league(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Register team for league
        """
        team_id = request_data["team_id"]
        league_id = request_data["league_id"]
        season = request_data.get("season", 1)
        player_ids = request_data["player_ids"]
        
        # Call the register_for_league function
        result = await self.supabase.rpc(
            "register_for_league",
            {
                "p_league_id": league_id,
                "p_team_id": team_id,
                "p_season": season,
                "p_player_ids": player_ids
            }
        ).execute()
        
        if hasattr(result, 'error') and result.error is not None:
            raise Exception(f"Failed to register for league: {result.error}")
            
        return {
            "success": True,
            "team_id": team_id,
            "league_id": league_id,
            "season": season,
            "registration_id": result.data
        }
    
    async def _rebrand_team(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Rebrand a team (change name)
        """
        team_id = request_data["team_id"]
        new_name = request_data["new_name"]
        
        self.logger.info(f"Rebranding team {team_id} to '{new_name}'")
        
        try:
            # Get current team info for verification
            team_query = self.supabase.table("teams").select("name").eq("id", team_id)
            team_response = team_query.execute()
            
            if not team_response.data:
                raise Exception(f"Team with ID {team_id} not found")
            
            old_name = team_response.data[0]["name"]
            self.logger.info(f"Current team name: '{old_name}'")
            
            # Update team name
            update_query = self.supabase.table("teams").update({
                "name": new_name,
                "updated_at": datetime.now().isoformat()
            }).eq("id", team_id)
            
            update_response = update_query.execute()
            
            if hasattr(update_response, 'error') and update_response.error is not None:
                raise Exception(f"Failed to rebrand team: {update_response.error}")
            
            # Check if logo URL is in metadata and update if present
            logo_url = None
            if "metadata" in request_data and request_data["metadata"] and "logo_url" in request_data["metadata"]:
                logo_url = request_data["metadata"]["logo_url"]
                self.logger.info(f"Updating team logo to: {logo_url}")
                
                # Update team logo in a separate query
                logo_update_query = self.supabase.table("teams").update({
                    "logo_url": logo_url
                }).eq("id", team_id)
                
                logo_update_response = logo_update_query.execute()
                
                if hasattr(logo_update_response, 'error') and logo_update_response.error is not None:
                    self.logger.warning(f"Failed to update team logo: {logo_update_response.error}")
            
            self.logger.info(f"Successfully rebranded team {team_id} from '{old_name}' to '{new_name}'")
            
            return {
                "success": True, 
                "team_id": team_id, 
                "old_name": old_name, 
                "new_name": new_name,
                "logo_url": logo_url
            }
        except Exception as e:
            self.logger.error(f"Error in _rebrand_team: {str(e)}", exc_info=True)
            raise Exception(f"Failed to rebrand team: {str(e)}")

    async def _update_online_id(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update a player's online ID
        """
        player_id = request_data["player_id"]
        new_online_id = request_data["new_online_id"]
        platform = request_data["platform"]
        
        # Get the player profile
        player_result = await self.supabase.table("players").select("*").eq("user_id", player_id).execute()
        
        if hasattr(player_result, 'error') and player_result.error is not None:
            raise Exception(f"Failed to find player: {player_result.error}")
        
        if not player_result.data:
            raise Exception(f"Player with ID {player_id} not found")
        
        # Build update data with platform-specific field
        update_data = {"updated_at": datetime.now().isoformat()}
        
        # Store in the appropriate platform field
        if platform == "psn":
            update_data["psn_id"] = new_online_id
        elif platform == "xbox":
            update_data["xbox_id"] = new_online_id
        elif platform == "steam":
            update_data["steam_id"] = new_online_id
        elif platform == "epic":
            update_data["epic_id"] = new_online_id
        else:
            # Generic online_id field or platform-specific handling
            update_data["online_id"] = new_online_id
        
        # Update player profile
        result = await self.supabase.table("players").update(update_data).eq("user_id", player_id).execute()
        
        if hasattr(result, 'error') and result.error is not None:
            raise Exception(f"Failed to update online ID: {result.error}")
            
        return {
            "success": True, 
            "player_id": player_id, 
            "platform": platform,
            "old_online_id": request_data.get("old_online_id"), 
            "new_online_id": new_online_id
        }
        
    async def _create_team(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new team
        """
        team_name = request_data["team_name"]
        captain_id = request_data["captain_id"]
        league_id = request_data.get("league_id")
        
        # Create team record
        team_data = {
            "name": team_name,
            "captain_id": captain_id,
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if league_id:
            team_data["league_id"] = league_id
            
        # Insert team
        team_result = await self.supabase.table("teams").insert(team_data).execute()
        
        if hasattr(team_result, 'error') and team_result.error is not None:
            raise Exception(f"Failed to create team: {team_result.error}")
            
        team_id = team_result.data[0]["id"]
        
        # Add captain as team member with captain role
        member_data = {
            "team_id": team_id,
            "user_id": captain_id,
            "role": "captain",
            "can_be_deleted": False,
            "created_at": datetime.now().isoformat()
        }
        
        member_result = await self.supabase.table("team_players").insert(member_data).execute()
        
        if hasattr(member_result, 'error') and member_result.error is not None:
            # If this fails, we should clean up the team
            await self.supabase.table("teams").delete().eq("id", team_id).execute()
            raise Exception(f"Failed to add captain to team: {member_result.error}")
            
        return {
            "success": True,
            "team_id": team_id,
            "team_name": team_name,
            "captain_id": captain_id
        }
    
    async def _update_request_status(self, request_id: str, status: str, result: Dict[str, Any] = None):
        """
        Update request status in the database
        """
        self.logger.info(f"Updating request {request_id} status to '{status}'")
        
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.now().isoformat()
            }
            
            if status in ["completed", "processing"]:
                update_data["processed_at"] = datetime.now().isoformat()
            
            if result:
                self.logger.debug(f"Adding result data to request {request_id}")
                
                # Use existing metadata and add result to it
                # Get the current metadata
                select_query = self.supabase.table("team_change_requests").select("metadata").eq("id", request_id)
                current_data = select_query.execute()
                
                current_metadata = {}
                if current_data.data and len(current_data.data) > 0:
                    current_metadata = current_data.data[0].get("metadata", {}) or {}
                
                # Combine existing metadata with result
                update_data["metadata"] = {
                    **(current_metadata or {}),
                    "result": result
                }
            
            # Update team_change_requests table
            update_query = self.supabase.table("team_change_requests").update(update_data).eq("id", request_id)
            response = update_query.execute()
            
            if hasattr(response, 'error') and response.error is not None:
                self.logger.error(f"Failed to update request status: {response.error}")
                # Don't raise exception here as this is usually called from catch blocks
            else:
                self.logger.info(f"Successfully updated request {request_id} status to '{status}'")
        except Exception as e:
            self.logger.error(f"Error updating request status: {str(e)}", exc_info=True)
            # Don't raise exception here as this is usually called from catch blocks
    
    async def get_request(self, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a request by ID
        """
        self.logger.info(f"Getting request with ID: {request_id}")
        
        try:
            query = self.supabase.table("team_change_requests").select("*").eq("id", request_id)
            result = query.execute()
            
            if hasattr(result, 'error') and result.error is not None:
                self.logger.error(f"Failed to get request: {result.error}")
                return None
            
            if not result.data or len(result.data) == 0:
                self.logger.warning(f"No request found with ID: {request_id}")
                return None
            
            self.logger.info(f"Successfully retrieved request with ID: {request_id}")
            return result.data[0]
        except Exception as e:
            self.logger.error(f"Error retrieving request: {str(e)}", exc_info=True)
            return None 