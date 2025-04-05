-- Tournament and League registration trigger function for team_change_requests

-- Update the handle_request_status_update function to handle tournament and league registrations
CREATE OR REPLACE FUNCTION public.handle_request_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  new_captain_id uuid;
  old_captain_id uuid;
  tournament_id uuid;
  league_id uuid;
  season integer;
  player_ids uuid[];
  registration_id uuid;
  v_registration_start timestamptz;
  v_registration_end timestamptz;
  v_current_time timestamptz := now();
begin
  -- Handle team transfers
  IF NEW.request_type = 'team_transfer' AND NEW.status = 'processing' THEN
    -- Get the captain IDs
    SELECT id INTO old_captain_id 
    FROM auth.users 
    WHERE email = NEW.metadata->>'oldCaptainName';

    SELECT user_id INTO new_captain_id 
    FROM public.players 
    WHERE display_name = NEW.metadata->>'newCaptainName';

    IF old_captain_id IS NULL OR new_captain_id IS NULL THEN
      RAISE EXCEPTION 'Could not find captain IDs. Old: %, New: %', 
        NEW.metadata->>'oldCaptainName', 
        NEW.metadata->>'newCaptainName';
    END IF;

    -- Call the transfer function directly
    PERFORM admin_transfer_team_ownership(
      NEW.team_id,
      new_captain_id,
      old_captain_id
    );

    -- Update request status to completed
    UPDATE team_change_requests 
    SET 
      status = 'completed',
      processed_at = NOW(),
      updated_at = NOW(),
      metadata = jsonb_set(
        metadata,
        '{action_result}',
        jsonb_build_object(
          'success', true,
          'message', 'Team ownership transferred successfully',
          'team_id', NEW.team_id,
          'old_captain_id', old_captain_id,
          'new_captain_id', new_captain_id
        )
      )
    WHERE id = NEW.id;
  
  -- Handle tournament registrations
  ELSIF NEW.request_type = 'tournament_registration' AND NEW.status = 'processing' THEN
    -- Get tournament ID
    tournament_id := NEW.tournament_id;
    
    -- Extract player IDs from metadata
    player_ids := ARRAY(
      SELECT jsonb_array_elements_text(NEW.metadata->'playerIds')::uuid
    );
    
    -- Check if registration period is open
    SELECT registration_start_date, registration_end_date 
    INTO v_registration_start, v_registration_end
    FROM tournaments 
    WHERE id = tournament_id;
    
    IF v_registration_start IS NOT NULL AND v_current_time < v_registration_start THEN
      UPDATE team_change_requests 
      SET 
        status = 'failed',
        processed_at = NOW(),
        updated_at = NOW(),
        last_error = 'Registration period has not started yet'
      WHERE id = NEW.id;
      
      RETURN NEW;
    END IF;
    
    IF v_registration_end IS NOT NULL AND v_current_time > v_registration_end THEN
      UPDATE team_change_requests 
      SET 
        status = 'failed',
        processed_at = NOW(),
        updated_at = NOW(),
        last_error = 'Registration period has ended'
      WHERE id = NEW.id;
      
      RETURN NEW;
    END IF;
    
    -- Verify all players are team members
    IF EXISTS (
      SELECT 1 FROM unnest(player_ids) player_id
      WHERE NOT EXISTS (
        SELECT 1 FROM team_players
        WHERE team_id = NEW.team_id
        AND user_id = player_id
      )
    ) THEN
      UPDATE team_change_requests 
      SET 
        status = 'failed',
        processed_at = NOW(),
        updated_at = NOW(),
        last_error = 'All players must be team members'
      WHERE id = NEW.id;
      
      RETURN NEW;
    END IF;
    
    -- Create tournament registration
    BEGIN
      INSERT INTO tournament_registrations (tournament_id, team_id)
      VALUES (tournament_id, NEW.team_id)
      RETURNING id INTO registration_id;
      
      -- Add players to tournament roster
      FOREACH player_id IN ARRAY player_ids
      LOOP
        INSERT INTO tournament_rosters (registration_id, player_id)
        VALUES (registration_id, player_id);
      END LOOP;
      
      -- Update request status to completed
      UPDATE team_change_requests 
      SET 
        status = 'completed',
        processed_at = NOW(),
        updated_at = NOW(),
        metadata = jsonb_set(
          metadata,
          '{action_result}',
          jsonb_build_object(
            'success', true,
            'message', 'Team successfully registered for tournament',
            'team_id', NEW.team_id,
            'tournament_id', tournament_id,
            'player_count', array_length(player_ids, 1),
            'registration_id', registration_id
          )
        )
      WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      -- Handle duplicate registration
      IF SQLSTATE = '23505' THEN -- Unique violation
        UPDATE team_change_requests 
        SET 
          status = 'failed',
          processed_at = NOW(),
          updated_at = NOW(),
          last_error = 'Team is already registered for this tournament'
        WHERE id = NEW.id;
      ELSE
        UPDATE team_change_requests 
        SET 
          status = 'failed',
          processed_at = NOW(),
          updated_at = NOW(),
          last_error = SQLERRM
        WHERE id = NEW.id;
      END IF;
    END;
  
  -- Handle league registrations
  ELSIF NEW.request_type = 'league_registration' AND NEW.status = 'processing' THEN
    -- Get league ID and season
    league_id := NEW.league_id;
    
    -- Get season from metadata or default to 1
    BEGIN
      season := (NEW.metadata->>'season')::integer;
    EXCEPTION WHEN OTHERS THEN
      season := 1;
    END;
    
    -- Extract player IDs from metadata
    player_ids := ARRAY(
      SELECT jsonb_array_elements_text(NEW.metadata->'playerIds')::uuid
    );
    
    -- Check if registration period is open
    SELECT registration_start_date, registration_end_date 
    INTO v_registration_start, v_registration_end
    FROM leagues 
    WHERE id = league_id;
    
    IF v_registration_start IS NOT NULL AND v_current_time < v_registration_start THEN
      UPDATE team_change_requests 
      SET 
        status = 'failed',
        processed_at = NOW(),
        updated_at = NOW(),
        last_error = 'League registration period has not started yet'
      WHERE id = NEW.id;
      
      RETURN NEW;
    END IF;
    
    IF v_registration_end IS NOT NULL AND v_current_time > v_registration_end THEN
      UPDATE team_change_requests 
      SET 
        status = 'failed',
        processed_at = NOW(),
        updated_at = NOW(),
        last_error = 'League registration period has ended'
      WHERE id = NEW.id;
      
      RETURN NEW;
    END IF;
    
    -- Verify all players are team members
    IF EXISTS (
      SELECT 1 FROM unnest(player_ids) player_id
      WHERE NOT EXISTS (
        SELECT 1 FROM team_players
        WHERE team_id = NEW.team_id
        AND user_id = player_id
      )
    ) THEN
      UPDATE team_change_requests 
      SET 
        status = 'failed',
        processed_at = NOW(),
        updated_at = NOW(),
        last_error = 'All players must be team members'
      WHERE id = NEW.id;
      
      RETURN NEW;
    END IF;
    
    -- Create league registration
    BEGIN
      INSERT INTO league_registrations (league_id, team_id, season)
      VALUES (league_id, NEW.team_id, season)
      RETURNING id INTO registration_id;
      
      -- Add players to league roster
      FOREACH player_id IN ARRAY player_ids
      LOOP
        INSERT INTO league_rosters (registration_id, player_id)
        VALUES (registration_id, player_id);
      END LOOP;
      
      -- Update request status to completed
      UPDATE team_change_requests 
      SET 
        status = 'completed',
        processed_at = NOW(),
        updated_at = NOW(),
        metadata = jsonb_set(
          metadata,
          '{action_result}',
          jsonb_build_object(
            'success', true,
            'message', 'Team successfully registered for league',
            'team_id', NEW.team_id,
            'league_id', league_id,
            'season', season,
            'player_count', array_length(player_ids, 1),
            'registration_id', registration_id
          )
        )
      WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      -- Handle duplicate registration
      IF SQLSTATE = '23505' THEN -- Unique violation
        UPDATE team_change_requests 
        SET 
          status = 'failed',
          processed_at = NOW(),
          updated_at = NOW(),
          last_error = 'Team is already registered for this league season'
        WHERE id = NEW.id;
      ELSE
        UPDATE team_change_requests 
        SET 
          status = 'failed',
          processed_at = NOW(),
          updated_at = NOW(),
          last_error = SQLERRM
        WHERE id = NEW.id;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure the trigger is set up
DROP TRIGGER IF EXISTS on_request_status_update_trigger ON team_change_requests;

CREATE TRIGGER on_request_status_update_trigger
AFTER UPDATE ON team_change_requests
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'processing')
EXECUTE FUNCTION handle_request_status_update();

-- Comment on function
COMMENT ON FUNCTION public.handle_request_status_update IS 'Handles processing of team change requests including team transfers, tournament registrations, and league registrations when status changes to processing'; 