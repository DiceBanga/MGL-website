/*
  # Process Team Change Requests Trigger Function

  This defines a trigger function that handles team change requests
  including team transfers, tournament registrations, and league registrations
  when their status is updated to 'processing'.
*/

-- Drop the function if it exists
drop function if exists public.handle_request_status_update;

-- Create the function to handle request status updates
create or replace function public.handle_request_status_update()
returns trigger
language plpgsql
security definer
as $$
declare
  v_team_id uuid;
  v_old_captain_id uuid;
  v_new_captain_id uuid;
  v_tournament_id uuid;
  v_league_id uuid;
  v_season integer;
  v_player_ids uuid[];
  v_metadata jsonb;
  v_result jsonb;
  v_registration_id uuid;
  v_reg_period_open boolean;
  v_all_team_members boolean;
  v_member_ids uuid[];
  v_count integer;
  v_error_message text;
begin
  -- Get the team ID and metadata from the request
  v_team_id := new.team_id;
  v_metadata := new.metadata;

  -- Handle different request types
  if new.request_type = 'team_transfer' then
    -- Get captain IDs from metadata
    v_old_captain_id := (v_metadata->>'old_captain_id')::uuid;
    v_new_captain_id := (v_metadata->>'new_captain_id')::uuid;

    -- Update team captain
    update public.teams
    set captain_id = v_new_captain_id
    where id = v_team_id and captain_id = v_old_captain_id;

    -- Update request status to completed
    update public.team_change_requests
    set 
      status = 'completed',
      metadata = jsonb_set(
        metadata,
        '{action_result}',
        jsonb_build_object(
          'success', true,
          'message', 'Team ownership transferred successfully',
          'team_id', v_team_id,
          'old_captain_id', v_old_captain_id,
          'new_captain_id', v_new_captain_id
        )
      )
    where id = new.id;

  elsif new.request_type = 'tournament_registration' then
    -- Get tournament ID and player IDs from metadata
    v_tournament_id := (v_metadata->>'tournament_id')::uuid;
    v_player_ids := array(select jsonb_array_elements_text(v_metadata->'playerIds')::uuid);
    
    -- Check if registration period is open
    select 
      (current_timestamp between registration_start_date and registration_end_date) into v_reg_period_open
    from public.tournaments
    where id = v_tournament_id;
    
    if not v_reg_period_open then
      -- Registration period is closed
      update public.team_change_requests
      set 
        status = 'failed',
        metadata = jsonb_set(
          metadata,
          '{action_result}',
          jsonb_build_object(
            'success', false,
            'message', 'Tournament registration period is closed',
            'team_id', v_team_id,
            'tournament_id', v_tournament_id
          )
        )
      where id = new.id;
      return new;
    end if;
    
    -- Check if all players are members of the team
    select 
      array_agg(user_id) into v_member_ids
    from public.team_players
    where team_id = v_team_id;
    
    v_all_team_members := true;
    for i in 1..array_length(v_player_ids, 1) loop
      if not v_player_ids[i] = any(v_member_ids) then
        v_all_team_members := false;
        exit;
      end if;
    end loop;
    
    if not v_all_team_members then
      -- Not all players are team members
      update public.team_change_requests
      set 
        status = 'failed',
        metadata = jsonb_set(
          metadata,
          '{action_result}',
          jsonb_build_object(
            'success', false,
            'message', 'Not all players are members of the team',
            'team_id', v_team_id,
            'tournament_id', v_tournament_id
          )
        )
      where id = new.id;
      return new;
    end if;
    
    -- Check if team is already registered
    select count(*) into v_count
    from public.tournament_registrations
    where tournament_id = v_tournament_id and team_id = v_team_id;
    
    if v_count > 0 then
      -- Team already registered
      update public.team_change_requests
      set 
        status = 'failed',
        metadata = jsonb_set(
          metadata,
          '{action_result}',
          jsonb_build_object(
            'success', false,
            'message', 'Team is already registered for this tournament',
            'team_id', v_team_id,
            'tournament_id', v_tournament_id
          )
        )
      where id = new.id;
      return new;
    end if;
    
    -- Create tournament registration
    insert into public.tournament_registrations (
      tournament_id, 
      team_id, 
      status, 
      payment_status
    ) 
    values (
      v_tournament_id, 
      v_team_id, 
      'approved', 
      'paid'
    )
    returning id into v_registration_id;
    
    -- Add players to tournament roster
    for i in 1..array_length(v_player_ids, 1) loop
      insert into public.tournament_rosters (
        registration_id,
        player_id,
        role
      )
      values (
        v_registration_id,
        v_player_ids[i],
        'player'
      );
    end loop;
    
    -- Update request status to completed
    update public.team_change_requests
    set 
      status = 'completed',
      metadata = jsonb_set(
        metadata,
        '{action_result}',
        jsonb_build_object(
          'success', true,
          'message', 'Tournament registration completed successfully',
          'team_id', v_team_id,
          'tournament_id', v_tournament_id,
          'player_count', array_length(v_player_ids, 1)
        )
      )
    where id = new.id;

  elsif new.request_type = 'league_registration' then
    -- Get league ID, season, and player IDs from metadata
    v_league_id := (v_metadata->>'league_id')::uuid;
    v_season := coalesce((v_metadata->>'season')::integer, 1);
    v_player_ids := array(select jsonb_array_elements_text(v_metadata->'playerIds')::uuid);
    
    -- Check if registration period is open
    select 
      (current_timestamp >= registration_start_date) into v_reg_period_open
    from public.leagues
    where id = v_league_id;
    
    if not v_reg_period_open then
      -- Registration period is closed
      update public.team_change_requests
      set 
        status = 'failed',
        metadata = jsonb_set(
          metadata,
          '{action_result}',
          jsonb_build_object(
            'success', false,
            'message', 'League registration period is closed',
            'team_id', v_team_id,
            'league_id', v_league_id,
            'season', v_season
          )
        )
      where id = new.id;
      return new;
    end if;
    
    -- Check if all players are members of the team
    select 
      array_agg(user_id) into v_member_ids
    from public.team_players
    where team_id = v_team_id;
    
    v_all_team_members := true;
    for i in 1..array_length(v_player_ids, 1) loop
      if not v_player_ids[i] = any(v_member_ids) then
        v_all_team_members := false;
        exit;
      end if;
    end loop;
    
    if not v_all_team_members then
      -- Not all players are team members
      update public.team_change_requests
      set 
        status = 'failed',
        metadata = jsonb_set(
          metadata,
          '{action_result}',
          jsonb_build_object(
            'success', false,
            'message', 'Not all players are members of the team',
            'team_id', v_team_id,
            'league_id', v_league_id,
            'season', v_season
          )
        )
      where id = new.id;
      return new;
    end if;
    
    -- Check if team is already registered for this season
    select count(*) into v_count
    from public.league_registrations
    where league_id = v_league_id and team_id = v_team_id and season = v_season;
    
    if v_count > 0 then
      -- Team already registered for this season
      update public.team_change_requests
      set 
        status = 'failed',
        metadata = jsonb_set(
          metadata,
          '{action_result}',
          jsonb_build_object(
            'success', false,
            'message', 'Team is already registered for this league season',
            'team_id', v_team_id,
            'league_id', v_league_id,
            'season', v_season
          )
        )
      where id = new.id;
      return new;
    end if;
    
    -- Create league registration
    insert into public.league_registrations (
      league_id, 
      team_id, 
      season,
      status, 
      payment_status
    ) 
    values (
      v_league_id, 
      v_team_id,
      v_season,
      'approved', 
      'paid'
    )
    returning id into v_registration_id;
    
    -- Add players to league roster
    for i in 1..array_length(v_player_ids, 1) loop
      insert into public.league_rosters (
        registration_id,
        player_id,
        role
      )
      values (
        v_registration_id,
        v_player_ids[i],
        'player'
      );
    end loop;
    
    -- Update request status to completed
    update public.team_change_requests
    set 
      status = 'completed',
      metadata = jsonb_set(
        metadata,
        '{action_result}',
        jsonb_build_object(
          'success', true,
          'message', 'League registration completed successfully',
          'team_id', v_team_id,
          'league_id', v_league_id,
          'season', v_season,
          'player_count', array_length(v_player_ids, 1)
        )
      )
    where id = new.id;
  end if;
  
  return new;
exception
  when others then
    -- Get error details
    get stacked diagnostics v_error_message = message_text;
    
    -- Update request status to failed with error message
    update public.team_change_requests
    set 
      status = 'failed',
      metadata = jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{action_result}',
        jsonb_build_object(
          'success', false,
          'message', v_error_message,
          'team_id', v_team_id
        )
      )
    where id = new.id;
    
    return new;
end;
$$;

-- Create the trigger
drop trigger if exists team_change_requests_status_trigger on public.team_change_requests;
create trigger team_change_requests_status_trigger
after update of status on public.team_change_requests
for each row
when (old.status <> 'processing' and new.status = 'processing')
execute function public.handle_request_status_update();

-- Add comment to the function
comment on function public.handle_request_status_update() is 'Trigger function that processes team change requests including team transfers, tournament registrations, and league registrations when their status is updated to processing'; 