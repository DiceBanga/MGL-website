

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid", "p_old_captain_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update team captain
  UPDATE teams t
  SET captain_id = p_new_captain_id
  WHERE t.id = p_team_id;

  -- Update old captain's role
  UPDATE team_players tp
  SET role = 'player',
      can_be_deleted = true
  WHERE tp.team_id = p_team_id
  AND tp.user_id = p_old_captain_id;

  -- Update new captain's role
  UPDATE team_players tp
  SET role = 'captain',
      can_be_deleted = false
  WHERE tp.team_id = p_team_id
  AND tp.user_id = p_new_captain_id;
END;
$$;


ALTER FUNCTION "public"."admin_transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid", "p_old_captain_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_and_process_team_transfer"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  transfer RECORD;
BEGIN
  -- First set status to approved
  UPDATE team_change_requests
  SET status = 'approved'
  WHERE id = p_request_id
    AND status = 'pending';
    
  -- Get the transfer details
  SELECT 
    id, 
    team_id::uuid, 
    old_value::uuid AS old_captain_id, 
    new_value::uuid AS new_captain_id
  INTO transfer
  FROM 
    team_change_requests
  WHERE 
    id = p_request_id;
  
  -- Call the existing admin function with explicit casts
  PERFORM admin_transfer_team_ownership(
    transfer.team_id, 
    transfer.new_captain_id,
    transfer.old_captain_id
  );
  
  -- Update status to completed
  UPDATE team_change_requests 
  SET 
    status = 'completed',
    processed_at = NOW()
  WHERE id = p_request_id;
  
END;
$$;


ALTER FUNCTION "public"."approve_and_process_team_transfer"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_team_join_request"("request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_team_id uuid;
  v_user_id uuid;
BEGIN
  -- Get request details
  SELECT team_id, user_id INTO v_team_id, v_user_id
  FROM team_join_requests
  WHERE id = request_id;

  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = v_team_id
    AND captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve join requests';
  END IF;

  -- Update request status
  UPDATE team_join_requests
  SET status = 'approved'
  WHERE id = request_id;

  -- Add player to team
  INSERT INTO team_players (team_id, user_id, role, can_be_deleted)
  VALUES (v_team_id, v_user_id, 'player', true);
END;
$$;


ALTER FUNCTION "public"."approve_team_join_request"("request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_team"("p_team_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Delete team_players first
  DELETE FROM team_players
  WHERE team_id = p_team_id;
  
  -- Delete the team
  DELETE FROM teams
  WHERE id = p_team_id;
END;
$$;


ALTER FUNCTION "public"."delete_team"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."express_interest_in_team"("player_id" "uuid", "team_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  player_info JSONB;
  team_info JSONB;
  player_exists BOOLEAN;
  team_exists BOOLEAN;
BEGIN
  -- Get player info
  SELECT 
    jsonb_build_object(
      'id', id,
      'display_name', display_name,
      'avatar_url', avatar_url
    ) INTO player_info
  FROM public.players
  WHERE id = player_id;
  
  -- Get team info
  SELECT 
    jsonb_build_object(
      'id', id,
      'name', name,
      'logo_url', logo_url
    ) INTO team_info
  FROM public.teams
  WHERE id = team_id;
  
  -- Check if player already exists in team's interested_players
  SELECT 
    EXISTS(
      SELECT 1 FROM jsonb_array_elements(interested_players) AS elem
      WHERE elem->>'id' = player_id::text
    ) INTO player_exists
  FROM public.teams
  WHERE id = team_id;
  
  -- Check if team already exists in player's interesting_teams
  SELECT 
    EXISTS(
      SELECT 1 FROM jsonb_array_elements(interesting_teams) AS elem
      WHERE elem->>'id' = team_id::text
    ) INTO team_exists
  FROM public.players
  WHERE id = player_id;
  
  -- Add player to team's interested_players if not already there
  IF NOT player_exists THEN
    UPDATE public.teams
    SET interested_players = interested_players || player_info
    WHERE id = team_id;
  END IF;
  
  -- Add team to player's interesting_teams if not already there
  IF NOT team_exists THEN
    UPDATE public.players
    SET interesting_teams = interesting_teams || team_info
    WHERE id = player_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."express_interest_in_team"("player_id" "uuid", "team_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "payment_method" "text" NOT NULL,
    "payment_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "metadata" "jsonb",
    "payment_details" "jsonb",
    "reference_id" "text",
    CONSTRAINT "valid_metadata_structure" CHECK (
CASE
    WHEN ("metadata" IS NOT NULL) THEN (("jsonb_typeof"(("metadata" -> 'transaction_details'::"text")) = 'object'::"text") AND ("jsonb_typeof"(("metadata" -> 'payment_method'::"text")) = 'object'::"text"))
    ELSE true
END)
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payments" IS 'Stores all payment transactions in the system';



COMMENT ON COLUMN "public"."payments"."payment_id" IS 'External payment ID from payment processor';



COMMENT ON COLUMN "public"."payments"."metadata" IS 'Additional metadata for the payment';



COMMENT ON COLUMN "public"."payments"."payment_details" IS 'Detailed payment information from payment processor';



COMMENT ON COLUMN "public"."payments"."reference_id" IS 'Internal reference ID for tracking payment purpose';



CREATE OR REPLACE FUNCTION "public"."get_payment_metadata"("payment_row" "public"."payments") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN jsonb_build_object(
    'transaction_id', payment_row.metadata->'transaction_details'->>'transaction_id',
    'processor_response', payment_row.metadata->'transaction_details'->>'processor_response',
    'authorization_code', payment_row.metadata->'transaction_details'->>'authorization_code',
    'payment_method', payment_row.metadata->'payment_method'->>'type',
    'last_four', payment_row.metadata->'payment_method'->>'last_four',
    'status', payment_row.status,
    'created_at', payment_row.created_at
  );
END;
$$;


ALTER FUNCTION "public"."get_payment_metadata"("payment_row" "public"."payments") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_change_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "request_type" "text" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "tournament_id" "uuid",
    "league_id" "uuid",
    "player_id" "uuid",
    "old_value" "text",
    "new_value" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "payment_id" "uuid",
    "item_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "payment_reference" "text",
    "webhook_data" "jsonb",
    "processing_attempts" integer DEFAULT 0,
    "processed_at" timestamp with time zone,
    "last_error" "text",
    CONSTRAINT "team_change_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'completed'::"text", 'failed'::"text", 'processing'::"text"])))
);


ALTER TABLE "public"."team_change_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."team_change_requests"."payment_reference" IS 'Reference to the payment ID from Square or other payment processor. Not required to be a UUID format.';



CREATE OR REPLACE FUNCTION "public"."get_team_requests"("p_team_id" "uuid", "p_status" "text" DEFAULT NULL::"text") RETURNS SETOF "public"."team_change_requests"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check that the current user is the team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id
    AND captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to view team requests';
  END IF;

  -- Return the requests
  IF p_status IS NULL THEN
    RETURN QUERY
    SELECT * FROM team_change_requests
    WHERE team_id = p_team_id
    ORDER BY created_at DESC;
  ELSE
    RETURN QUERY
    SELECT * FROM team_change_requests
    WHERE team_id = p_team_id
    AND status = p_status
    ORDER BY created_at DESC;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_team_requests"("p_team_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_request_status_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_captain_id uuid;
  old_captain_id uuid;
  new_captain_display_name text;
  old_captain_email text;
begin
  -- Only handle team transfers in 'processing' state
  IF NEW.request_type = 'team_transfer' AND NEW.status = 'processing' THEN
    
    old_captain_email := NEW.metadata->>'oldCaptainName';
    new_captain_display_name := NEW.metadata->>'newCaptainName';

    RAISE NOTICE 'Attempting transfer from % to %', old_captain_email, new_captain_display_name;

    -- Get the old captain ID from auth.users using email
    SELECT id INTO old_captain_id 
    FROM auth.users 
    WHERE email = old_captain_email;

    IF old_captain_id IS NULL THEN
      RAISE EXCEPTION 'Could not find old captain with email %', old_captain_email;
    END IF;
    RAISE NOTICE 'Found old captain ID: %', old_captain_id;

    -- Get the new captain ID from public.players using display_name
    SELECT user_id INTO new_captain_id 
    FROM public.players
    WHERE display_name = new_captain_display_name;

    IF new_captain_id IS NULL THEN
      RAISE EXCEPTION 'Could not find new captain with display_name %', new_captain_display_name;
    END IF;
    RAISE NOTICE 'Found new captain ID: %', new_captain_id;

    -- Call the transfer function directly
    RAISE NOTICE 'Calling admin_transfer_team_ownership for team %, new captain %, old captain %', NEW.team_id, new_captain_id, old_captain_id;
    PERFORM admin_transfer_team_ownership(
      NEW.team_id,
      new_captain_id,
      old_captain_id
    );
    RAISE NOTICE 'admin_transfer_team_ownership completed';

    -- Update request status to completed
    UPDATE public.team_change_requests 
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
    RAISE NOTICE 'Request status updated to completed';
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- On error, update the request with the error details
  UPDATE public.team_change_requests 
  SET 
    status = 'failed',
    processed_at = NOW(),
    updated_at = NOW(),
    last_error = SQLERRM
  WHERE id = NEW.id;
  
  RAISE EXCEPTION 'Error processing team transfer: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."handle_request_status_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_team"("team_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM team_players
    WHERE team_players.team_id = join_team.team_id
    AND team_players.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already a member of this team';
  END IF;

  -- Insert new team member
  INSERT INTO team_players (team_id, user_id, role, can_be_deleted)
  VALUES (join_team.team_id, auth.uid(), 'player', true);
END;
$$;


ALTER FUNCTION "public"."join_team"("team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_approved_team_transfers"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  transfer RECORD;
BEGIN
  -- Loop through approved transfers
  FOR transfer IN 
    SELECT 
      id, 
      team_id::uuid, 
      old_value::uuid AS old_captain_id, 
      new_value::uuid AS new_captain_id
    FROM 
      team_change_requests
    WHERE 
      request_type = 'team_transfer' 
      AND status = 'approved'
      AND processed_at IS NULL
  LOOP
    -- Call the existing admin function with explicit casts
    PERFORM admin_transfer_team_ownership(
      transfer.team_id, 
      transfer.new_captain_id,
      transfer.old_captain_id
    );
    
    -- Update status to completed
    UPDATE team_change_requests 
    SET 
      status = 'completed',
      processed_at = NOW()
    WHERE id = transfer.id;
    
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."process_approved_team_transfers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_team_transfer_on_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if this is a team transfer being updated to 'approved'
  IF NEW.request_type = 'team_transfer' AND NEW.status = 'approved' AND 
     (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    
    -- Call the admin function to actually transfer the team
    PERFORM admin_transfer_team_ownership(
      NEW.team_id::uuid, 
      NEW.new_value::uuid,
      NEW.old_value::uuid
    );
    
    -- Mark as completed
    NEW.status := 'completed';
    NEW.processed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_team_transfer_on_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_for_league"("p_league_id" "uuid", "p_team_id" "uuid", "p_season" integer, "p_player_ids" "uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_registration_id uuid;
  v_player_id uuid;
  v_registration_start timestamptz;
  v_registration_end timestamptz;
  v_current_time timestamptz := now();
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id
    AND captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to register team for league';
  END IF;

  -- Check if registration period is open
  SELECT registration_start_date, registration_end_date 
  INTO v_registration_start, v_registration_end
  FROM leagues 
  WHERE id = p_league_id;
  
  IF v_registration_start IS NOT NULL AND v_current_time < v_registration_start THEN
    RAISE EXCEPTION 'Registration period has not started yet';
  END IF;
  
  IF v_registration_end IS NOT NULL AND v_current_time > v_registration_end THEN
    RAISE EXCEPTION 'Registration period has ended';
  END IF;

  -- Verify all players are team members
  IF EXISTS (
    SELECT 1 FROM unnest(p_player_ids) player_id
    WHERE NOT EXISTS (
      SELECT 1 FROM team_players
      WHERE team_id = p_team_id
      AND user_id = player_id
    )
  ) THEN
    RAISE EXCEPTION 'All players must be team members';
  END IF;

  -- Create league registration
  INSERT INTO league_registrations (league_id, team_id, season)
  VALUES (p_league_id, p_team_id, p_season)
  RETURNING id INTO v_registration_id;

  -- Add players to league roster
  FOREACH v_player_id IN ARRAY p_player_ids
  LOOP
    INSERT INTO league_rosters (registration_id, player_id)
    VALUES (v_registration_id, v_player_id);
  END LOOP;

  RETURN v_registration_id;
END;
$$;


ALTER FUNCTION "public"."register_for_league"("p_league_id" "uuid", "p_team_id" "uuid", "p_season" integer, "p_player_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_for_tournament"("p_tournament_id" "uuid", "p_team_id" "uuid", "p_player_ids" "uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_registration_id uuid;
  v_player_id uuid;
  v_registration_start timestamptz;
  v_registration_end timestamptz;
  v_current_time timestamptz := now();
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id
    AND captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to register team for tournament';
  END IF;

  -- Check if registration period is open
  SELECT registration_start_date, registration_end_date 
  INTO v_registration_start, v_registration_end
  FROM tournaments 
  WHERE id = p_tournament_id;
  
  IF v_registration_start IS NOT NULL AND v_current_time < v_registration_start THEN
    RAISE EXCEPTION 'Registration period has not started yet';
  END IF;
  
  IF v_registration_end IS NOT NULL AND v_current_time > v_registration_end THEN
    RAISE EXCEPTION 'Registration period has ended';
  END IF;

  -- Verify all players are team members
  IF EXISTS (
    SELECT 1 FROM unnest(p_player_ids) player_id
    WHERE NOT EXISTS (
      SELECT 1 FROM team_players
      WHERE team_id = p_team_id
      AND user_id = player_id
    )
  ) THEN
    RAISE EXCEPTION 'All players must be team members';
  END IF;

  -- Create tournament registration
  INSERT INTO tournament_registrations (tournament_id, team_id)
  VALUES (p_tournament_id, p_team_id)
  RETURNING id INTO v_registration_id;

  -- Add players to tournament roster
  FOREACH v_player_id IN ARRAY p_player_ids
  LOOP
    INSERT INTO tournament_rosters (registration_id, player_id)
    VALUES (v_registration_id, v_player_id);
  END LOOP;

  RETURN v_registration_id;
END;
$$;


ALTER FUNCTION "public"."register_for_tournament"("p_tournament_id" "uuid", "p_team_id" "uuid", "p_player_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_interest_in_team"("player_id" "uuid", "team_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Remove player from team's interested_players
  UPDATE public.teams
  SET interested_players = (
    SELECT jsonb_agg(p)
    FROM jsonb_array_elements(interested_players) p
    WHERE p->>'id' != player_id::text
  )
  WHERE id = team_id;
  
  -- Remove team from player's interesting_teams
  UPDATE public.players
  SET interesting_teams = (
    SELECT jsonb_agg(t)
    FROM jsonb_array_elements(interesting_teams) t
    WHERE t->>'id' != team_id::text
  )
  WHERE id = player_id;
END;
$$;


ALTER FUNCTION "public"."remove_interest_in_team"("player_id" "uuid", "team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."retry_failed_request"("request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Mark the request as processing
  UPDATE team_change_requests
  SET status = 'processing',
      processing_attempts = processing_attempts + 1,
      updated_at = now()
  WHERE id = request_id
  AND status = 'failed';

  -- The actual processing will be done by the backend
END;
$$;


ALTER FUNCTION "public"."retry_failed_request"("request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = p_team_id
    AND t.captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to transfer team ownership';
  END IF;

  -- Update team captain
  UPDATE teams t
  SET captain_id = p_new_captain_id
  WHERE t.id = p_team_id;

  -- Update old captain's role
  UPDATE team_players tp
  SET role = 'player',
      can_be_deleted = true
  WHERE tp.team_id = p_team_id
  AND tp.user_id = auth.uid();

  -- Update new captain's role
  UPDATE team_players tp
  SET role = 'captain',
      can_be_deleted = false
  WHERE tp.team_id = p_team_id
  AND tp.user_id = p_new_captain_id;
END;
$$;


ALTER FUNCTION "public"."transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_team_ownership"("team_id" "uuid", "new_captain_id" "uuid", "old_captain_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update the team captain
  UPDATE teams
  SET captain_id = new_captain_id
  WHERE id = team_id
  AND captain_id = old_captain_id;
  
  -- Update the old captain's role to 'player'
  UPDATE team_players
  SET role = 'player',
      can_be_deleted = true
  WHERE team_id = team_id
  AND user_id = old_captain_id;
  
  -- Update the new captain's role to 'captain'
  UPDATE team_players
  SET role = 'captain',
      can_be_deleted = false
  WHERE team_id = team_id
  AND user_id = new_captain_id;
  
  -- Remove the new captain from interested_players if present
  UPDATE teams
  SET interested_players = (
    SELECT jsonb_agg(p)
    FROM jsonb_array_elements(interested_players) p
    WHERE p->>'id' != new_captain_id::text
  )
  WHERE id = team_id;
  
  -- Remove the team from the new captain's interesting_teams if present
  UPDATE players
  SET interesting_teams = (
    SELECT jsonb_agg(t)
    FROM jsonb_array_elements(interesting_teams) t
    WHERE t->>'id' != team_id::text
  )
  WHERE id = new_captain_id;
END;
$$;


ALTER FUNCTION "public"."transfer_team_ownership"("team_id" "uuid", "new_captain_id" "uuid", "old_captain_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_league_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM league_registrations lr
    JOIN teams t ON t.id = lr.team_id
    WHERE lr.id = p_registration_id
    AND t.captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to update league roster';
  END IF;

  -- Verify new player is a team member
  IF NOT EXISTS (
    SELECT 1 FROM league_registrations lr
    JOIN team_players tp ON tp.team_id = lr.team_id
    WHERE lr.id = p_registration_id
    AND tp.user_id = p_new_player_id
  ) THEN
    RAISE EXCEPTION 'New player must be a team member';
  END IF;

  -- Update roster
  UPDATE league_rosters
  SET player_id = p_new_player_id
  WHERE registration_id = p_registration_id
  AND player_id = p_player_id;
END;
$$;


ALTER FUNCTION "public"."update_league_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tournament_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify current user is team captain
  IF NOT EXISTS (
    SELECT 1 FROM tournament_registrations tr
    JOIN teams t ON t.id = tr.team_id
    WHERE tr.id = p_registration_id
    AND t.captain_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to update tournament roster';
  END IF;

  -- Verify new player is a team member
  IF NOT EXISTS (
    SELECT 1 FROM tournament_registrations tr
    JOIN team_players tp ON tp.team_id = tr.team_id
    WHERE tr.id = p_registration_id
    AND tp.user_id = p_new_player_id
  ) THEN
    RAISE EXCEPTION 'New player must be a team member';
  END IF;

  -- Update roster
  UPDATE tournament_rosters
  SET player_id = p_new_player_id
  WHERE registration_id = p_registration_id
  AND player_id = p_player_id;
END;
$$;


ALTER FUNCTION "public"."update_tournament_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_payment_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.metadata IS NOT NULL THEN
    -- Ensure required fields exist
    IF NOT (
      NEW.metadata ? 'transaction_details' AND
      NEW.metadata ? 'payment_method'
    ) THEN
      RAISE EXCEPTION 'Invalid metadata structure: missing required fields';
    END IF;
    
    -- Validate transaction_details
    IF NOT (
      NEW.metadata->'transaction_details' ? 'processor_response' AND
      NEW.metadata->'transaction_details' ? 'authorization_code'
    ) THEN
      RAISE EXCEPTION 'Invalid transaction_details structure';
    END IF;
    
    -- Validate payment_method
    IF NOT (
      NEW.metadata->'payment_method' ? 'type' AND
      NEW.metadata->'payment_method' ? 'last_four'
    ) THEN
      RAISE EXCEPTION 'Invalid payment_method structure';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_payment_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_database_setup"() RETURNS TABLE("check_name" "text", "status" "text", "details" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_constraint_exists boolean;
  v_index_exists boolean;
  v_function_exists boolean;
BEGIN
  -- Check tournament_registrations table constraints
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tournament_registrations_status_check'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RETURN QUERY SELECT 
      'Tournament Registrations Status Constraint'::text,
      'OK'::text,
      'Status constraint exists and enforces valid values'::text;
  ELSE
    RETURN QUERY SELECT 
      'Tournament Registrations Status Constraint'::text,
      'ERROR'::text,
      'Status constraint is missing'::text;
  END IF;

  -- Check league_registrations table constraints
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'league_registrations_status_check'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RETURN QUERY SELECT 
      'League Registrations Status Constraint'::text,
      'OK'::text,
      'Status constraint exists and enforces valid values'::text;
  ELSE
    RETURN QUERY SELECT 
      'League Registrations Status Constraint'::text,
      'ERROR'::text,
      'Status constraint is missing'::text;
  END IF;

  -- Check unique indexes
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'unique_active_tournament_registration'
  ) INTO v_index_exists;
  
  IF v_index_exists THEN
    RETURN QUERY SELECT 
      'Tournament Registrations Unique Index'::text,
      'OK'::text,
      'Unique index exists for active registrations'::text;
  ELSE
    RETURN QUERY SELECT 
      'Tournament Registrations Unique Index'::text,
      'ERROR'::text,
      'Unique index is missing'::text;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'unique_active_league_registration'
  ) INTO v_index_exists;
  
  IF v_index_exists THEN
    RETURN QUERY SELECT 
      'League Registrations Unique Index'::text,
      'OK'::text,
      'Unique index exists for active registrations'::text;
  ELSE
    RETURN QUERY SELECT 
      'League Registrations Unique Index'::text,
      'ERROR'::text,
      'Unique index is missing'::text;
  END IF;

  -- Check registration functions
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'register_for_tournament'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    RETURN QUERY SELECT 
      'Tournament Registration Function'::text,
      'OK'::text,
      'Function exists and handles duplicate registrations'::text;
  ELSE
    RETURN QUERY SELECT 
      'Tournament Registration Function'::text,
      'ERROR'::text,
      'Function is missing'::text;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'register_for_league'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    RETURN QUERY SELECT 
      'League Registration Function'::text,
      'OK'::text,
      'Function exists and handles duplicate registrations'::text;
  ELSE
    RETURN QUERY SELECT 
      'League Registration Function'::text,
      'ERROR'::text,
      'Function is missing'::text;
  END IF;

  -- Check for existing registrations with invalid status
  RETURN QUERY SELECT 
    'Invalid Registration Statuses'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM tournament_registrations 
        WHERE status NOT IN ('pending', 'approved', 'rejected', 'withdrawn')
      ) OR EXISTS (
        SELECT 1 FROM league_registrations 
        WHERE status NOT IN ('pending', 'approved', 'rejected', 'withdrawn')
      ) THEN 'ERROR'
      ELSE 'OK'
    END,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM tournament_registrations 
        WHERE status NOT IN ('pending', 'approved', 'rejected', 'withdrawn')
      ) OR EXISTS (
        SELECT 1 FROM league_registrations 
        WHERE status NOT IN ('pending', 'approved', 'rejected', 'withdrawn')
      ) THEN 'Found registrations with invalid status values'
      ELSE 'All registrations have valid status values'
    END;

  -- Check for duplicate active registrations
  RETURN QUERY SELECT 
    'Duplicate Active Registrations'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM (
          SELECT tournament_id, team_id, COUNT(*)
          FROM tournament_registrations
          WHERE status != 'withdrawn'
          GROUP BY tournament_id, team_id
          HAVING COUNT(*) > 1
        ) AS duplicates
      ) OR EXISTS (
        SELECT 1 FROM (
          SELECT league_id, team_id, season, COUNT(*)
          FROM league_registrations
          WHERE status != 'withdrawn'
          GROUP BY league_id, team_id, season
          HAVING COUNT(*) > 1
        ) AS duplicates
      ) THEN 'ERROR'
      ELSE 'OK'
    END,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM (
          SELECT tournament_id, team_id, COUNT(*)
          FROM tournament_registrations
          WHERE status != 'withdrawn'
          GROUP BY tournament_id, team_id
          HAVING COUNT(*) > 1
        ) AS duplicates
      ) OR EXISTS (
        SELECT 1 FROM (
          SELECT league_id, team_id, season, COUNT(*)
          FROM league_registrations
          WHERE status != 'withdrawn'
          GROUP BY league_id, team_id, season
          HAVING COUNT(*) > 1
        ) AS duplicates
      ) THEN 'Found duplicate active registrations'
      ELSE 'No duplicate active registrations found'
    END;
END;
$$;


ALTER FUNCTION "public"."verify_database_setup"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."box_scores" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "game_id" "uuid",
    "player_id" "uuid",
    "team_id" "uuid",
    "games_played" integer DEFAULT 1,
    "field_goals_made" integer DEFAULT 0,
    "field_goals_attempted" integer DEFAULT 0,
    "three_points_made" integer DEFAULT 0,
    "three_points_attempted" integer DEFAULT 0,
    "free_throws_made" integer DEFAULT 0,
    "free_throws_attempted" integer DEFAULT 0,
    "rebounds" integer DEFAULT 0,
    "assists" integer DEFAULT 0,
    "steals" integer DEFAULT 0,
    "blocks" integer DEFAULT 0,
    "turnovers" integer DEFAULT 0,
    "fouls" integer DEFAULT 0,
    "points" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."box_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debug_logs" (
    "id" integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "function_name" "text",
    "message" "text",
    "data" "jsonb"
);


ALTER TABLE "public"."debug_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."debug_logs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."debug_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."debug_logs_id_seq" OWNED BY "public"."debug_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid",
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "banner_url" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "scheduled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "home_score" integer,
    "away_score" integer,
    CONSTRAINT "games_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'live'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."games" OWNER TO "postgres";


COMMENT ON COLUMN "public"."games"."home_score" IS 'The score of the home team';



COMMENT ON COLUMN "public"."games"."away_score" IS 'The score of the away team';



CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_name" "text" NOT NULL,
    "item_id" "text" NOT NULL,
    "item_description" "text",
    "reg_price" numeric(10,2) NOT NULL,
    "current_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "metadata" "jsonb",
    "enabled" boolean DEFAULT true,
    CONSTRAINT "items_item_id_format_check" CHECK (("item_id" ~ '^[0-9]{4}$'::"text"))
);


ALTER TABLE "public"."items" OWNER TO "postgres";


COMMENT ON TABLE "public"."items" IS 'Stores purchasable items in the system';



COMMENT ON COLUMN "public"."items"."item_id" IS '4-digit unique identifier for the item';



COMMENT ON COLUMN "public"."items"."current_price" IS 'Current price of the item in USD';



CREATE TABLE IF NOT EXISTS "public"."league_admins" (
    "league_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "league_admins_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'moderator'::"text"])))
);


ALTER TABLE "public"."league_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid",
    "team_id" "uuid",
    "season" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "registration_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "league_registrations_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "league_registrations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."league_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_roster" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "online_id" "text",
    "status" "text" DEFAULT 'active'::"text",
    "is_captain" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."league_roster" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_rosters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" "uuid",
    "player_id" "uuid",
    "role" "text" DEFAULT 'player'::"text" NOT NULL,
    "jersey_number" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "league_rosters_role_check" CHECK (("role" = ANY (ARRAY['player'::"text", 'substitute'::"text"])))
);


ALTER TABLE "public"."league_rosters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_sponsors" (
    "league_id" "uuid" NOT NULL,
    "sponsor_id" "uuid" NOT NULL,
    "sponsorship_level" "text" DEFAULT 'standard'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "league_sponsors_sponsorship_level_check" CHECK (("sponsorship_level" = ANY (ARRAY['title'::"text", 'platinum'::"text", 'gold'::"text", 'silver'::"text", 'bronze'::"text", 'standard'::"text"])))
);


ALTER TABLE "public"."league_sponsors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "banner_url" "text",
    "website" "text",
    "entry_fee" bigint,
    "timezone" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "registration_start_date" "date",
    "season_start_date" "date",
    "playoff_start_date" "date",
    "late_entry_fee" bigint,
    "season" smallint DEFAULT '1'::smallint,
    "prize_amount" bigint,
    "payment_amount" numeric DEFAULT 100.00,
    "current_season" integer DEFAULT 1,
    "prize_pool" numeric DEFAULT 0,
    CONSTRAINT "leagues_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'archived'::"text", 'registration'::"text"])))
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


COMMENT ON TABLE "public"."leagues" IS 'Stores league information';



COMMENT ON COLUMN "public"."leagues"."status" IS 'Current status of the league: active, inactive, archived, or registration';



COMMENT ON COLUMN "public"."leagues"."payment_amount" IS 'Registration fee for the league in USD';



CREATE TABLE IF NOT EXISTS "public"."metadata" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "payment_id" "text" NOT NULL,
    "metadata" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "banner_url" "text",
    "website" "text",
    "country" "text",
    "timezone" "text",
    "language" "text" DEFAULT 'en'::"text",
    "theme" "jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "author_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "news_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."news" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_metadata" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "text" NOT NULL,
    "user_id" "uuid",
    "response_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "timezone" "text",
    "language" "text" DEFAULT 'en'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "twitter_handle" "text",
    "bio" "text",
    "twitch_handle" "text",
    "youtube_handle" "text",
    "instagram_handle" "text",
    "discord_handle" "text",
    "avatar_upload_path" "text",
    "role" "text" DEFAULT 'user'::"text",
    "interesting_teams" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "players_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'owner'::"text"]))),
    CONSTRAINT "players_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'banned'::"text"])))
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "banner_url" "text",
    "website" "text",
    "timezone" "text",
    "language" "text" DEFAULT 'en'::"text",
    "theme" "jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sponsors_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."sponsors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."standings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid",
    "team_id" "uuid",
    "wins" integer DEFAULT 0,
    "losses" integer DEFAULT 0,
    "points_for" integer DEFAULT 0,
    "points_against" integer DEFAULT 0,
    "rank" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."standings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."statistics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "player_id" "uuid",
    "team_id" "uuid",
    "tournament_id" "uuid",
    "stats_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "statistics_check" CHECK (((("player_id" IS NOT NULL) AND ("team_id" IS NULL)) OR (("team_id" IS NOT NULL) AND ("player_id" IS NULL))))
);


ALTER TABLE "public"."statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_join_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_join_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."team_join_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_players" (
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'player'::"text",
    "jersey_number" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "can_be_deleted" boolean DEFAULT true,
    CONSTRAINT "team_players_role_check" CHECK (("role" = ANY (ARRAY['captain'::"text", 'player'::"text", 'substitute'::"text"])))
);


ALTER TABLE "public"."team_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "league_id" "uuid",
    "tournament_id" "uuid",
    "name" "text" NOT NULL,
    "logo_url" "text",
    "banner_url" "text",
    "website" "text",
    "email" "text",
    "phone" "text",
    "timezone" "text",
    "language" "text" DEFAULT 'en'::"text",
    "captain_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "team_tag" "text",
    "interested_players" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "teams_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid",
    "team_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "registration_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "tournament_registrations_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "tournament_registrations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."tournament_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_roster" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "online_id" "text",
    "status" "text" DEFAULT 'active'::"text",
    "is_captain" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_roster" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_rosters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" "uuid",
    "player_id" "uuid",
    "role" "text" DEFAULT 'player'::"text" NOT NULL,
    "jersey_number" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tournament_rosters_role_check" CHECK (("role" = ANY (ARRAY['player'::"text", 'substitute'::"text"])))
);


ALTER TABLE "public"."tournament_rosters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_sponsors" (
    "tournament_id" "uuid" NOT NULL,
    "sponsor_id" "uuid" NOT NULL,
    "sponsorship_level" "text" DEFAULT 'standard'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tournament_sponsors_sponsorship_level_check" CHECK (("sponsorship_level" = ANY (ARRAY['title'::"text", 'platinum'::"text", 'gold'::"text", 'silver'::"text", 'bronze'::"text", 'standard'::"text"])))
);


ALTER TABLE "public"."tournament_sponsors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "league_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "banner_url" "text",
    "website" "text",
    "timezone" "text",
    "theme" "jsonb",
    "status" "text" DEFAULT 'upcoming'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "start_date" "date",
    "end_date" "date",
    "prize_pool" "text",
    "payment_amount" numeric DEFAULT 50.00,
    "registration_start_date" timestamp with time zone,
    "registration_end_date" timestamp with time zone,
    CONSTRAINT "tournaments_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'registration'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


COMMENT ON TABLE "public"."tournaments" IS 'Stores tournament information';



COMMENT ON COLUMN "public"."tournaments"."status" IS 'Current status of the tournament: upcoming, registration, active, completed, or cancelled';



COMMENT ON COLUMN "public"."tournaments"."payment_amount" IS 'Registration fee for the tournament in USD';



ALTER TABLE ONLY "public"."debug_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."debug_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."box_scores"
    ADD CONSTRAINT "box_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."debug_logs"
    ADD CONSTRAINT "debug_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_admins"
    ADD CONSTRAINT "league_admins_pkey" PRIMARY KEY ("league_id", "user_id");



ALTER TABLE ONLY "public"."league_registrations"
    ADD CONSTRAINT "league_registrations_league_id_team_id_season_key" UNIQUE ("league_id", "team_id", "season");



ALTER TABLE ONLY "public"."league_registrations"
    ADD CONSTRAINT "league_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_roster"
    ADD CONSTRAINT "league_roster_league_id_team_id_player_id_key" UNIQUE ("league_id", "team_id", "player_id");



ALTER TABLE ONLY "public"."league_roster"
    ADD CONSTRAINT "league_roster_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_rosters"
    ADD CONSTRAINT "league_rosters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_rosters"
    ADD CONSTRAINT "league_rosters_registration_id_player_id_key" UNIQUE ("registration_id", "player_id");



ALTER TABLE ONLY "public"."league_sponsors"
    ADD CONSTRAINT "league_sponsors_pkey" PRIMARY KEY ("league_id", "sponsor_id");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."metadata"
    ADD CONSTRAINT "metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_metadata"
    ADD CONSTRAINT "payment_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_id_key" UNIQUE ("payment_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."sponsors"
    ADD CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standings"
    ADD CONSTRAINT "standings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standings"
    ADD CONSTRAINT "standings_tournament_id_team_id_key" UNIQUE ("tournament_id", "team_id");



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_join_requests"
    ADD CONSTRAINT "team_join_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_join_requests"
    ADD CONSTRAINT "team_join_requests_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_pkey" PRIMARY KEY ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_tournament_id_team_id_key" UNIQUE ("tournament_id", "team_id");



ALTER TABLE ONLY "public"."tournament_roster"
    ADD CONSTRAINT "tournament_roster_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_roster"
    ADD CONSTRAINT "tournament_roster_tournament_id_team_id_player_id_key" UNIQUE ("tournament_id", "team_id", "player_id");



ALTER TABLE ONLY "public"."tournament_rosters"
    ADD CONSTRAINT "tournament_rosters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_rosters"
    ADD CONSTRAINT "tournament_rosters_registration_id_player_id_key" UNIQUE ("registration_id", "player_id");



ALTER TABLE ONLY "public"."tournament_sponsors"
    ADD CONSTRAINT "tournament_sponsors_pkey" PRIMARY KEY ("tournament_id", "sponsor_id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_box_scores_game_id" ON "public"."box_scores" USING "btree" ("game_id");



CREATE INDEX "idx_games_scheduled_at" ON "public"."games" USING "btree" ("scheduled_at");



CREATE INDEX "idx_games_status" ON "public"."games" USING "btree" ("status");



CREATE INDEX "idx_games_tournament_id" ON "public"."games" USING "btree" ("tournament_id");



CREATE INDEX "idx_league_admins_user_id" ON "public"."league_admins" USING "btree" ("user_id");



CREATE INDEX "idx_league_registrations_date" ON "public"."league_registrations" USING "btree" ("registration_date" DESC);



CREATE INDEX "idx_league_registrations_payment" ON "public"."league_registrations" USING "btree" ("payment_status", "league_id");



CREATE INDEX "idx_league_registrations_team_status" ON "public"."league_registrations" USING "btree" ("team_id", "status", "registration_date");



CREATE INDEX "idx_league_roster_league_id" ON "public"."league_roster" USING "btree" ("league_id");



CREATE INDEX "idx_league_roster_player_id" ON "public"."league_roster" USING "btree" ("player_id");



CREATE INDEX "idx_league_roster_team_id" ON "public"."league_roster" USING "btree" ("team_id");



CREATE INDEX "idx_leagues_name" ON "public"."leagues" USING "btree" ("name");



CREATE INDEX "idx_leagues_status" ON "public"."leagues" USING "btree" ("status");



CREATE INDEX "idx_payment_metadata_payment_id" ON "public"."payment_metadata" USING "btree" ("payment_id");



CREATE INDEX "idx_payment_metadata_user_id" ON "public"."payment_metadata" USING "btree" ("user_id");



CREATE INDEX "idx_payments_created_at" ON "public"."payments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payments_metadata_event_id" ON "public"."metadata" USING "btree" ((("metadata" ->> 'eventId'::"text")));



CREATE INDEX "idx_payments_metadata_payment_id" ON "public"."metadata" USING "btree" ("payment_id");



CREATE INDEX "idx_payments_metadata_status" ON "public"."payments" USING "btree" ((("metadata" ->> 'status'::"text")));



CREATE INDEX "idx_payments_metadata_transaction_id" ON "public"."payments" USING "btree" ((("metadata" ->> 'transaction_id'::"text")));



CREATE INDEX "idx_payments_reference_id" ON "public"."payments" USING "btree" ("reference_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_user_id" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "idx_players_display_name" ON "public"."players" USING "btree" ("display_name");



CREATE INDEX "idx_players_user_id" ON "public"."players" USING "btree" ("user_id");



CREATE INDEX "idx_standings_tournament_id" ON "public"."standings" USING "btree" ("tournament_id");



CREATE INDEX "idx_statistics_player_id" ON "public"."statistics" USING "btree" ("player_id");



CREATE INDEX "idx_statistics_team_id" ON "public"."statistics" USING "btree" ("team_id");



CREATE INDEX "idx_team_change_requests_status" ON "public"."team_change_requests" USING "btree" ("status");



CREATE INDEX "idx_team_change_requests_team_id" ON "public"."team_change_requests" USING "btree" ("team_id");



CREATE INDEX "idx_team_players_team_role" ON "public"."team_players" USING "btree" ("team_id", "role");



CREATE INDEX "idx_team_players_user_id" ON "public"."team_players" USING "btree" ("user_id");



CREATE INDEX "idx_team_players_user_id_team_id" ON "public"."team_players" USING "btree" ("user_id", "team_id");



CREATE INDEX "idx_teams_name" ON "public"."teams" USING "btree" ("name");



CREATE INDEX "idx_tournament_registrations_date" ON "public"."tournament_registrations" USING "btree" ("registration_date" DESC);



CREATE INDEX "idx_tournament_registrations_payment" ON "public"."tournament_registrations" USING "btree" ("payment_status", "tournament_id");



CREATE INDEX "idx_tournament_registrations_team_status" ON "public"."tournament_registrations" USING "btree" ("team_id", "status", "registration_date");



CREATE INDEX "idx_tournament_roster_player_id" ON "public"."tournament_roster" USING "btree" ("player_id");



CREATE INDEX "idx_tournament_roster_team_id" ON "public"."tournament_roster" USING "btree" ("team_id");



CREATE INDEX "idx_tournament_roster_tournament_id" ON "public"."tournament_roster" USING "btree" ("tournament_id");



CREATE INDEX "idx_tournaments_name" ON "public"."tournaments" USING "btree" ("name");



CREATE INDEX "idx_tournaments_status" ON "public"."tournaments" USING "btree" ("status");



CREATE INDEX "team_change_requests_request_type_idx" ON "public"."team_change_requests" USING "btree" ("request_type");



CREATE INDEX "team_change_requests_requested_by_idx" ON "public"."team_change_requests" USING "btree" ("requested_by");



CREATE INDEX "team_change_requests_status_idx" ON "public"."team_change_requests" USING "btree" ("status");



CREATE INDEX "team_change_requests_team_id_idx" ON "public"."team_change_requests" USING "btree" ("team_id");



CREATE INDEX "team_players_team_id_idx" ON "public"."team_players" USING "btree" ("team_id");



CREATE INDEX "team_players_user_id_idx" ON "public"."team_players" USING "btree" ("user_id");



CREATE UNIQUE INDEX "unique_active_league_registration" ON "public"."league_registrations" USING "btree" ("league_id", "team_id", "season", "status") WHERE ("status" <> 'withdrawn'::"text");



CREATE UNIQUE INDEX "unique_active_tournament_registration" ON "public"."tournament_registrations" USING "btree" ("tournament_id", "team_id", "status") WHERE ("status" <> 'withdrawn'::"text");



CREATE OR REPLACE TRIGGER "on_request_status_update_trigger" AFTER UPDATE ON "public"."team_change_requests" FOR EACH ROW WHEN ((("old"."status" IS DISTINCT FROM "new"."status") AND ("new"."status" = 'processing'::"text"))) EXECUTE FUNCTION "public"."handle_request_status_update"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."metadata" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "team_transfer_processing_trigger" BEFORE UPDATE ON "public"."team_change_requests" FOR EACH ROW EXECUTE FUNCTION "public"."process_team_transfer_on_update"();



CREATE OR REPLACE TRIGGER "update_box_scores_updated_at" BEFORE UPDATE ON "public"."box_scores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_games_updated_at" BEFORE UPDATE ON "public"."games" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_league_registrations_updated_at" BEFORE UPDATE ON "public"."league_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_league_rosters_updated_at" BEFORE UPDATE ON "public"."league_rosters" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_leagues_updated_at" BEFORE UPDATE ON "public"."leagues" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_news_updated_at" BEFORE UPDATE ON "public"."news" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_metadata_updated_at" BEFORE UPDATE ON "public"."payment_metadata" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_players_updated_at" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sponsors_updated_at" BEFORE UPDATE ON "public"."sponsors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_team_join_requests_updated_at" BEFORE UPDATE ON "public"."team_join_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tournament_registrations_updated_at" BEFORE UPDATE ON "public"."tournament_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tournament_rosters_updated_at" BEFORE UPDATE ON "public"."tournament_rosters" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tournaments_updated_at" BEFORE UPDATE ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_payment_metadata_trigger" BEFORE INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."validate_payment_metadata"();



ALTER TABLE ONLY "public"."box_scores"
    ADD CONSTRAINT "box_scores_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."box_scores"
    ADD CONSTRAINT "box_scores_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id");



ALTER TABLE ONLY "public"."box_scores"
    ADD CONSTRAINT "box_scores_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."metadata"
    ADD CONSTRAINT "fk_payment" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("payment_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_admins"
    ADD CONSTRAINT "league_admins_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_admins"
    ADD CONSTRAINT "league_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_registrations"
    ADD CONSTRAINT "league_registrations_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_registrations"
    ADD CONSTRAINT "league_registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_roster"
    ADD CONSTRAINT "league_roster_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."league_roster"
    ADD CONSTRAINT "league_roster_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id");



ALTER TABLE ONLY "public"."league_roster"
    ADD CONSTRAINT "league_roster_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."league_rosters"
    ADD CONSTRAINT "league_rosters_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_rosters"
    ADD CONSTRAINT "league_rosters_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."league_registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_sponsors"
    ADD CONSTRAINT "league_sponsors_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_sponsors"
    ADD CONSTRAINT "league_sponsors_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_metadata"
    ADD CONSTRAINT "payment_metadata_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standings"
    ADD CONSTRAINT "standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."standings"
    ADD CONSTRAINT "standings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id");



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."statistics"
    ADD CONSTRAINT "statistics_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id");



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."players"("user_id");



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."team_change_requests"
    ADD CONSTRAINT "team_change_requests_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."team_join_requests"
    ADD CONSTRAINT "team_join_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_join_requests"
    ADD CONSTRAINT "team_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."players"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."players"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "public"."players"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_roster"
    ADD CONSTRAINT "tournament_roster_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id");



ALTER TABLE ONLY "public"."tournament_roster"
    ADD CONSTRAINT "tournament_roster_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."tournament_roster"
    ADD CONSTRAINT "tournament_roster_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."tournament_rosters"
    ADD CONSTRAINT "tournament_rosters_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_rosters"
    ADD CONSTRAINT "tournament_rosters_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_sponsors"
    ADD CONSTRAINT "tournament_sponsors_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_sponsors"
    ADD CONSTRAINT "tournament_sponsors_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can read all payment metadata" ON "public"."payment_metadata" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."user_id" = "auth"."uid"()) AND ("players"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Admins can update payment metadata" ON "public"."payments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."user_id" = "auth"."uid"()) AND ("players"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Admins can view all payment metadata" ON "public"."payment_metadata" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."user_id" = "auth"."uid"()) AND ("players"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Admins can view all payment metadata" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."user_id" = "auth"."uid"()) AND ("players"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Allow admins to insert leagues" ON "public"."leagues" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow admins to insert tournaments" ON "public"."tournaments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow admins to update leagues" ON "public"."leagues" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow admins to update tournaments" ON "public"."tournaments" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow owners to manage leagues" ON "public"."leagues" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."league_admins"
  WHERE (("league_admins"."league_id" = "leagues"."id") AND ("league_admins"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow owners to manage tournaments" ON "public"."tournaments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read access to items" ON "public"."items" FOR SELECT USING (true);



CREATE POLICY "Anyone can read team members" ON "public"."team_players" FOR SELECT USING (true);



CREATE POLICY "Enable delete for users based on user_id" ON "public"."players" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."players" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."players" FOR SELECT USING (true);



CREATE POLICY "Enable read access for league registrations" ON "public"."league_registrations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for league rosters" ON "public"."league_rosters" FOR SELECT USING (true);



CREATE POLICY "Enable read access for team join requests" ON "public"."team_join_requests" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_join_requests"."team_id") AND ("teams"."captain_id" = "auth"."uid"()))))));



CREATE POLICY "Enable read access for tournament registrations" ON "public"."tournament_registrations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for tournament rosters" ON "public"."tournament_rosters" FOR SELECT USING (true);



CREATE POLICY "Enable team captains to delete join requests" ON "public"."team_join_requests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_join_requests"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Enable team captains to manage join requests" ON "public"."team_join_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_join_requests"."team_id") AND ("teams"."captain_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_join_requests"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Enable team captains to manage league registrations" ON "public"."league_registrations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "league_registrations"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Enable team captains to manage league rosters" ON "public"."league_rosters" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."league_registrations" "lr"
     JOIN "public"."teams" "t" ON (("t"."id" = "lr"."team_id")))
  WHERE (("lr"."id" = "league_rosters"."registration_id") AND ("t"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Enable team captains to manage tournament registrations" ON "public"."tournament_registrations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "tournament_registrations"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Enable team captains to manage tournament rosters" ON "public"."tournament_rosters" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."tournament_registrations" "tr"
     JOIN "public"."teams" "t" ON (("t"."id" = "tr"."team_id")))
  WHERE (("tr"."id" = "tournament_rosters"."registration_id") AND ("t"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Enable team captains to register for leagues" ON "public"."league_registrations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "league_registrations"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Enable team captains to register for tournaments" ON "public"."tournament_registrations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "tournament_registrations"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Enable update for users based on user_id" ON "public"."players" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable users to create join requests" ON "public"."team_join_requests" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("status" = 'pending'::"text") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."team_players"
  WHERE (("team_players"."team_id" = "team_join_requests"."team_id") AND ("team_players"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Leagues are viewable by everyone" ON "public"."leagues" FOR SELECT USING (true);



CREATE POLICY "Only authenticated users can read settings" ON "public"."app_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Owners are allowed to manage games" ON "public"."games" TO "authenticated" USING (true);



CREATE POLICY "Owners can manage all content" ON "public"."players" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'owner'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'owner'::"text")))));



CREATE POLICY "Players are viewable by everyone" ON "public"."players" FOR SELECT USING (true);



CREATE POLICY "System can insert payment metadata" ON "public"."payment_metadata" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Team captains can delete their teams" ON "public"."teams" FOR DELETE TO "authenticated" USING (("captain_id" = "auth"."uid"()));



CREATE POLICY "Team captains can manage members" ON "public"."team_players" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_players"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))) AND ("can_be_deleted" = true)));



CREATE POLICY "Team captains can manage team members except captains" ON "public"."team_players" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_players"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))) AND ("can_be_deleted" = true)));



CREATE POLICY "Team captains can update their teams" ON "public"."teams" FOR UPDATE TO "authenticated" USING ((("captain_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."team_change_requests" "tcr"
     JOIN "public"."payments" "p" ON ((("p"."metadata" ->> 'request_id'::"text") = ("tcr"."id")::"text")))
  WHERE (("tcr"."team_id" = "teams"."id") AND ("tcr"."request_type" = 'team_transfer'::"text") AND ("tcr"."status" = 'approved'::"text") AND ("p"."status" = 'completed'::"text") AND ("tcr"."new_value" = ("teams"."captain_id")::"text")))))) WITH CHECK ((("captain_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."team_change_requests" "tcr"
     JOIN "public"."payments" "p" ON ((("p"."metadata" ->> 'request_id'::"text") = ("tcr"."id")::"text")))
  WHERE (("tcr"."team_id" = "teams"."id") AND ("tcr"."request_type" = 'team_transfer'::"text") AND ("tcr"."status" = 'approved'::"text") AND ("p"."status" = 'completed'::"text") AND ("tcr"."new_value" = ("teams"."captain_id")::"text"))))));



CREATE POLICY "Team captains can view their team's requests" ON "public"."team_change_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_change_requests"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))));



CREATE POLICY "Teams are editable by team captains" ON "public"."teams" TO "authenticated" USING (("captain_id" = "auth"."uid"()));



CREATE POLICY "Teams are viewable by everyone" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Tournaments are editable by admins" ON "public"."tournaments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."user_id" = "auth"."uid"()) AND ("players"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."user_id" = "auth"."uid"()) AND ("players"."role" = 'admin'::"text")))));



CREATE POLICY "Tournaments are viewable by everyone" ON "public"."tournaments" FOR SELECT USING (true);



CREATE POLICY "Users are allowed to view games" ON "public"."games" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can create payments" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create teams" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (("captain_id" = "auth"."uid"()));



CREATE POLICY "Users can create their own payments" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own payment metadata" ON "public"."metadata" FOR INSERT WITH CHECK (("payment_id" IN ( SELECT "payments"."payment_id"
   FROM "public"."payments"
  WHERE ("payments"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can join teams" ON "public"."team_players" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."team_players" "tp"
  WHERE (("tp"."team_id" = "team_players"."team_id") AND ("tp"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can read own payments" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own payment metadata" ON "public"."payment_metadata" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own pending payments" ON "public"."payments" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can view requests they created" ON "public"."team_change_requests" FOR SELECT TO "authenticated" USING (("requested_by" = "auth"."uid"()));



CREATE POLICY "Users can view their own payment metadata" ON "public"."metadata" FOR SELECT USING (("payment_id" IN ( SELECT "payments"."payment_id"
   FROM "public"."payments"
  WHERE ("payments"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own payment metadata" ON "public"."payment_metadata" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own payment metadata" ON "public"."payments" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own payments" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_test_user_operations" ON "public"."payments" USING (("user_id" = 'ecac78cd-e1a9-484a-a55e-4da6aa6c103a'::"uuid")) WITH CHECK (("user_id" = 'ecac78cd-e1a9-484a-a55e-4da6aa6c103a'::"uuid"));



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."box_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_rosters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_sponsors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leagues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sponsors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."statistics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_join_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_rosters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_sponsors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."admin_transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid", "p_old_captain_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid", "p_old_captain_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid", "p_old_captain_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_and_process_team_transfer"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_and_process_team_transfer"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_and_process_team_transfer"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_team_join_request"("request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_team_join_request"("request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_team_join_request"("request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_team"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_team"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_team"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."express_interest_in_team"("player_id" "uuid", "team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."express_interest_in_team"("player_id" "uuid", "team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."express_interest_in_team"("player_id" "uuid", "team_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_payment_metadata"("payment_row" "public"."payments") TO "anon";
GRANT ALL ON FUNCTION "public"."get_payment_metadata"("payment_row" "public"."payments") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_payment_metadata"("payment_row" "public"."payments") TO "service_role";



GRANT ALL ON TABLE "public"."team_change_requests" TO "anon";
GRANT ALL ON TABLE "public"."team_change_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."team_change_requests" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_requests"("p_team_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_requests"("p_team_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_requests"("p_team_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_request_status_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_request_status_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_request_status_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."join_team"("team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."join_team"("team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_team"("team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_approved_team_transfers"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_approved_team_transfers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_approved_team_transfers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_team_transfer_on_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_team_transfer_on_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_team_transfer_on_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."register_for_league"("p_league_id" "uuid", "p_team_id" "uuid", "p_season" integer, "p_player_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."register_for_league"("p_league_id" "uuid", "p_team_id" "uuid", "p_season" integer, "p_player_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_for_league"("p_league_id" "uuid", "p_team_id" "uuid", "p_season" integer, "p_player_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."register_for_tournament"("p_tournament_id" "uuid", "p_team_id" "uuid", "p_player_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."register_for_tournament"("p_tournament_id" "uuid", "p_team_id" "uuid", "p_player_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_for_tournament"("p_tournament_id" "uuid", "p_team_id" "uuid", "p_player_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_interest_in_team"("player_id" "uuid", "team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_interest_in_team"("player_id" "uuid", "team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_interest_in_team"("player_id" "uuid", "team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."retry_failed_request"("request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."retry_failed_request"("request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."retry_failed_request"("request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_team_ownership"("p_team_id" "uuid", "p_new_captain_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_team_ownership"("team_id" "uuid", "new_captain_id" "uuid", "old_captain_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_team_ownership"("team_id" "uuid", "new_captain_id" "uuid", "old_captain_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_team_ownership"("team_id" "uuid", "new_captain_id" "uuid", "old_captain_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_league_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_league_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_league_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tournament_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_tournament_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tournament_roster"("p_registration_id" "uuid", "p_player_id" "uuid", "p_new_player_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_payment_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_payment_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_payment_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_database_setup"() TO "anon";
GRANT ALL ON FUNCTION "public"."verify_database_setup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_database_setup"() TO "service_role";


















GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."box_scores" TO "anon";
GRANT ALL ON TABLE "public"."box_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."box_scores" TO "service_role";



GRANT ALL ON TABLE "public"."debug_logs" TO "anon";
GRANT ALL ON TABLE "public"."debug_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."debug_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."debug_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."debug_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."debug_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."league_admins" TO "anon";
GRANT ALL ON TABLE "public"."league_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."league_admins" TO "service_role";



GRANT ALL ON TABLE "public"."league_registrations" TO "anon";
GRANT ALL ON TABLE "public"."league_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."league_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."league_roster" TO "anon";
GRANT ALL ON TABLE "public"."league_roster" TO "authenticated";
GRANT ALL ON TABLE "public"."league_roster" TO "service_role";



GRANT ALL ON TABLE "public"."league_rosters" TO "anon";
GRANT ALL ON TABLE "public"."league_rosters" TO "authenticated";
GRANT ALL ON TABLE "public"."league_rosters" TO "service_role";



GRANT ALL ON TABLE "public"."league_sponsors" TO "anon";
GRANT ALL ON TABLE "public"."league_sponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."league_sponsors" TO "service_role";



GRANT ALL ON TABLE "public"."leagues" TO "anon";
GRANT ALL ON TABLE "public"."leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."leagues" TO "service_role";



GRANT ALL ON TABLE "public"."metadata" TO "anon";
GRANT ALL ON TABLE "public"."metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."metadata" TO "service_role";



GRANT ALL ON TABLE "public"."news" TO "anon";
GRANT ALL ON TABLE "public"."news" TO "authenticated";
GRANT ALL ON TABLE "public"."news" TO "service_role";



GRANT ALL ON TABLE "public"."payment_metadata" TO "anon";
GRANT ALL ON TABLE "public"."payment_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON TABLE "public"."sponsors" TO "anon";
GRANT ALL ON TABLE "public"."sponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsors" TO "service_role";



GRANT ALL ON TABLE "public"."standings" TO "anon";
GRANT ALL ON TABLE "public"."standings" TO "authenticated";
GRANT ALL ON TABLE "public"."standings" TO "service_role";



GRANT ALL ON TABLE "public"."statistics" TO "anon";
GRANT ALL ON TABLE "public"."statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."statistics" TO "service_role";



GRANT ALL ON TABLE "public"."team_join_requests" TO "anon";
GRANT ALL ON TABLE "public"."team_join_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."team_join_requests" TO "service_role";



GRANT ALL ON TABLE "public"."team_players" TO "anon";
GRANT ALL ON TABLE "public"."team_players" TO "authenticated";
GRANT ALL ON TABLE "public"."team_players" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_registrations" TO "anon";
GRANT ALL ON TABLE "public"."tournament_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_roster" TO "anon";
GRANT ALL ON TABLE "public"."tournament_roster" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_roster" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_rosters" TO "anon";
GRANT ALL ON TABLE "public"."tournament_rosters" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_rosters" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_sponsors" TO "anon";
GRANT ALL ON TABLE "public"."tournament_sponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_sponsors" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
