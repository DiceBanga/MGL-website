async def execute_approved_request(self, request_id: str) -> bool:
    """Execute an approved request after payment has been processed"""
    # Fetch the request from the database
    request_data = await self.get_request(request_id)
    
    if not request_data:
        logger.error(f"Request {request_id} not found")
        return False
        
    if request_data.get('status') != 'approved':
        logger.error(f"Cannot execute request {request_id} with status {request_data.get('status')}")
        return False
    
    # Execute the request based on its type
    try:
        request_type = request_data.get('request_type')
        
        if request_type == 'team_transfer':
            return await self._execute_team_transfer(request_data)
        elif request_type == 'roster_change':
            return await self._execute_roster_change(request_data)
        elif request_type == 'tournament_registration':
            return await self._execute_tournament_registration(request_data)
        elif request_type == 'league_registration':
            return await self._execute_league_registration(request_data)
        elif request_type == 'team_rebrand':
            return await self._execute_team_rebrand(request_data)
        elif request_type == 'online_id_change':
            return await self._execute_online_id_change(request_data)
        elif request_type == 'team_creation':
            return await self._execute_team_creation(request_data)
        else:
            logger.error(f"Unknown request type: {request_type}")
            return False
    except Exception as e:
        logger.exception(f"Error executing request {request_id}: {str(e)}")
        # Update the request status to failed
        await self._update_request_status(request_id, 'failed', {'error': str(e)})
        return False 

async def _execute_team_transfer(self, request_data: dict) -> bool:
    """Execute a team transfer request"""
    team_id = request_data.get('team_id')
    old_captain_id = request_data.get('old_captain_id')
    new_captain_id = request_data.get('new_captain_id')
    
    if not all([team_id, old_captain_id, new_captain_id]):
        logger.error(f"Missing required data for team transfer: {request_data}")
        return False
    
    try:
        # Update the team's captain_id
        result = await self.supabase.table('teams').update({
            'captain_id': new_captain_id,
            'updated_at': datetime.now().isoformat()
        }).eq('id', team_id).execute()
        
        if not result.data:
            logger.error(f"Failed to update team captain: {result.error}")
            return False
        
        # Update the request status to completed
        await self._update_request_status(request_data.get('request_id'), 'completed')
        return True
    except Exception as e:
        logger.exception(f"Error executing team transfer: {str(e)}")
        return False 

async def _update_request_status(self, request_id: str, status: str, metadata: dict = None) -> bool:
    """Update the status of a request"""
    try:
        update_data = {
            'status': status,
            'updated_at': datetime.now().isoformat()
        }
        
        if metadata:
            # If we have existing metadata, merge it
            request = await self.get_request(request_id)
            existing_metadata = request.get('metadata', {}) if request else {}
            
            if existing_metadata and isinstance(existing_metadata, dict):
                existing_metadata.update(metadata)
                update_data['metadata'] = existing_metadata
            else:
                update_data['metadata'] = metadata
        
        result = await self.supabase.table('team_change_requests').update(update_data).eq('request_id', request_id).execute()
        
        if not result.data:
            logger.error(f"Failed to update request status: {result.error}")
            return False
            
        return True
    except Exception as e:
        logger.exception(f"Error updating request status: {str(e)}")
        return False 

async def _execute_team_rebrand(self, request_data: dict) -> bool:
    """Execute a team rebrand request"""
    team_id = request_data.get('team_id')
    new_name = request_data.get('new_name')
    
    if not all([team_id, new_name]):
        logger.error(f"Missing required data for team rebrand: {request_data}")
        return False
    
    try:
        # Update the team's name
        result = await self.supabase.table('teams').update({
            'name': new_name,
            'updated_at': datetime.now().isoformat()
        }).eq('id', team_id).execute()
        
        if not result.data:
            logger.error(f"Failed to update team name: {result.error}")
            return False
        
        # Update the request status to completed
        await self._update_request_status(request_data.get('request_id'), 'completed')
        return True
    except Exception as e:
        logger.exception(f"Error executing team rebrand: {str(e)}")
        return False

async def _execute_online_id_change(self, request_data: dict) -> bool:
    """Execute an online ID change request"""
    team_id = request_data.get('team_id')
    player_id = request_data.get('player_id')
    new_online_id = request_data.get('new_online_id')
    platform = request_data.get('platform', 'psn')
    
    if not all([team_id, player_id, new_online_id]):
        logger.error(f"Missing required data for online ID change: {request_data}")
        return False
    
    try:
        # Update the online ID in league_roster
        league_result = await self.supabase.table('league_roster').update({
            'online_id': new_online_id,
            'updated_at': datetime.now().isoformat()
        }).eq('team_id', team_id).eq('player_id', player_id).execute()
        
        # Update the online ID in tournament_roster
        tournament_result = await self.supabase.table('tournament_roster').update({
            'online_id': new_online_id,
            'updated_at': datetime.now().isoformat()
        }).eq('team_id', team_id).eq('player_id', player_id).execute()
        
        # Update the request status to completed (even if no rows were updated)
        await self._update_request_status(request_data.get('request_id'), 'completed')
        return True
    except Exception as e:
        logger.exception(f"Error executing online ID change: {str(e)}")
        return False

async def _execute_roster_change(self, request_data: dict) -> bool:
    """Execute a roster change request"""
    team_id = request_data.get('team_id')
    player_id = request_data.get('player_id')
    operation = request_data.get('operation')
    new_role = request_data.get('new_role')
    
    if not all([team_id, player_id, operation]):
        logger.error(f"Missing required data for roster change: {request_data}")
        return False
    
    try:
        if operation == 'add':
            # Add player to team_players
            team_player_result = await self.supabase.table('team_players').insert({
                'team_id': team_id,
                'user_id': player_id,
                'role': new_role or 'player',
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }).execute()
            
            if not team_player_result.data:
                logger.error(f"Failed to add player to team: {team_player_result.error}")
                return False
                
        elif operation == 'remove':
            # Remove player from team_players
            team_player_result = await self.supabase.table('team_players').delete().eq('team_id', team_id).eq('user_id', player_id).execute()
            
            # Also remove from league_roster and tournament_roster
            await self.supabase.table('league_roster').delete().eq('team_id', team_id).eq('player_id', player_id).execute()
            await self.supabase.table('tournament_roster').delete().eq('team_id', team_id).eq('player_id', player_id).execute()
            
        elif operation == 'update':
            # Update player role
            team_player_result = await self.supabase.table('team_players').update({
                'role': new_role,
                'updated_at': datetime.now().isoformat()
            }).eq('team_id', team_id).eq('user_id', player_id).execute()
            
            if not team_player_result.data:
                logger.error(f"Failed to update player role: {team_player_result.error}")
                return False
        
        # Update the request status to completed
        await self._update_request_status(request_data.get('request_id'), 'completed')
        return True
    except Exception as e:
        logger.exception(f"Error executing roster change: {str(e)}")
        return False 

async def _execute_league_registration(self, request_data: dict) -> bool:
    """Execute a league registration request"""
    team_id = request_data.get('team_id')
    league_id = request_data.get('league_id')
    player_ids = request_data.get('player_ids', [])
    
    if not all([team_id, league_id]) or not player_ids:
        logger.error(f"Missing required data for league registration: {request_data}")
        return False
    
    try:
        # Register the team for the league
        for player_id in player_ids:
            # Check if player is already registered
            existing = await self.supabase.table('league_roster').select('*').eq('team_id', team_id).eq('league_id', league_id).eq('player_id', player_id).execute()
            
            if existing.data:
                # Update existing entry
                await self.supabase.table('league_roster').update({
                    'status': 'active',
                    'updated_at': datetime.now().isoformat()
                }).eq('team_id', team_id).eq('league_id', league_id).eq('player_id', player_id).execute()
            else:
                # Create new entry
                await self.supabase.table('league_roster').insert({
                    'team_id': team_id,
                    'league_id': league_id,
                    'player_id': player_id,
                    'status': 'active',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }).execute()
        
        # Update the request status to completed
        await self._update_request_status(request_data.get('request_id'), 'completed')
        return True
    except Exception as e:
        logger.exception(f"Error executing league registration: {str(e)}")
        return False

async def _execute_tournament_registration(self, request_data: dict) -> bool:
    """Execute a tournament registration request"""
    team_id = request_data.get('team_id')
    tournament_id = request_data.get('tournament_id')
    player_ids = request_data.get('player_ids', [])
    
    if not all([team_id, tournament_id]) or not player_ids:
        logger.error(f"Missing required data for tournament registration: {request_data}")
        return False
    
    try:
        # Register the team for the tournament
        for player_id in player_ids:
            # Check if player is already registered
            existing = await self.supabase.table('tournament_roster').select('*').eq('team_id', team_id).eq('tournament_id', tournament_id).eq('player_id', player_id).execute()
            
            if existing.data:
                # Update existing entry
                await self.supabase.table('tournament_roster').update({
                    'status': 'active',
                    'updated_at': datetime.now().isoformat()
                }).eq('team_id', team_id).eq('tournament_id', tournament_id).eq('player_id', player_id).execute()
            else:
                # Create new entry
                await self.supabase.table('tournament_roster').insert({
                    'team_id': team_id,
                    'tournament_id': tournament_id,
                    'player_id': player_id,
                    'status': 'active',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }).execute()
        
        # Update the request status to completed
        await self._update_request_status(request_data.get('request_id'), 'completed')
        return True
    except Exception as e:
        logger.exception(f"Error executing tournament registration: {str(e)}")
        return False 

async def _execute_team_creation(self, request_data: dict) -> bool:
    """Execute a team creation request"""
    team_id = request_data.get('team_id')
    team_name = request_data.get('team_name')
    captain_id = request_data.get('captain_id')
    league_id = request_data.get('league_id')
    
    if not all([team_id, team_name, captain_id]):
        logger.error(f"Missing required data for team creation: {request_data}")
        return False
    
    try:
        # Create the team
        team_result = await self.supabase.table('teams').insert({
            'id': team_id,
            'name': team_name,
            'captain_id': captain_id,
            'league_id': league_id,
            'status': 'active',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }).execute()
        
        if not team_result.data:
            logger.error(f"Failed to create team: {team_result.error}")
            return False
        
        # Add captain to team_players
        player_result = await self.supabase.table('team_players').insert({
            'team_id': team_id,
            'user_id': captain_id,
            'role': 'captain',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }).execute()
        
        if not player_result.data:
            logger.error(f"Failed to add captain to team: {player_result.error}")
            # Don't return false here, we want to continue
        
        # Update the request status to completed
        await self._update_request_status(request_data.get('request_id'), 'completed')
        return True
    except Exception as e:
        logger.exception(f"Error executing team creation: {str(e)}")
        return False 