-- supabase/migrations/20250402184500_create_request_trigger_function.sql

-- Ensure the pg_net extension is enabled (uncomment if needed)
-- create extension if not exists pg_net with schema extensions;

-- Create the trigger function
create or replace function public.handle_request_status_update()
returns trigger
language plpgsql
security definer -- Allows the function to run with elevated privileges, necessary for pg_net/function invocation
set search_path = public
as $$
declare
  payload jsonb;
  request_id uuid;
  request_type text;
  -- Add other variables if needed to build the payload
begin
  -- Check if the status is one that should trigger the Edge Function
  if new.status in ('payment_complete', 'ready_for_execution') then
    -- Extract necessary data from the NEW record
    request_id := new.id;
    request_type := new.request_type;

    -- Construct the payload to send to the Edge Function
    -- Sending the entire NEW record is often simplest
    payload := jsonb_build_object(
      'id', new.id,
      'request_type', new.request_type,
      'team_id', new.team_id,
      'requested_by', new.requested_by,
      'metadata', new.metadata,
      'status', new.status,
      'created_at', new.created_at,
      'updated_at', new.updated_at,
      'item_id', new.item_id,
      'player_id', new.player_id,
      'old_value', new.old_value,
      'new_value', new.new_value,
      'tournament_id', new.tournament_id,
      'league_id', new.league_id
      -- Add any other relevant fields from team_change_requests
    );

    -- Log the invocation attempt (optional, requires log level settings)
    raise log 'Invoking execute-request-action for request_id: %, type: %', request_id, request_type;

    -- Invoke the Supabase Edge Function asynchronously using pg_net
    -- Ensure 'execute-request-action' matches your function name
    -- The Supabase URL needs to be correctly configured for pg_net or use Supabase's internal function invocation if preferred/available
    -- Note: Using service_role key directly here is generally discouraged.
    -- Prefer Supabase's built-in function invocation if it handles auth securely.
    -- This pg_net example assumes direct invocation for simplicity illustration.
    -- You might need to adjust headers for Supabase function invocation auth.

    -- Alternative using supabase_functions.invoke (if available and preferred):
    -- select supabase_functions.invoke(
    --   function_name := 'execute-request-action',
    --   payload := payload::json
    -- );

    -- Using pg_net (ensure pg_net is enabled and configured)
    -- Requires SUPABASE_URL env var to be accessible or hardcoded (not recommended)
    -- Requires appropriate headers for auth (Service Role Key - use with caution)
    perform net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/execute-request-action', -- Construct URL dynamically if possible
        body := payload,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true) -- Fetch key securely
            -- Add other necessary headers if any
        ),
        timeout_milliseconds := 5000 -- Adjust timeout as needed
    );

    raise log 'Invocation request sent for request_id: %', request_id;

  end if;

  return new; -- Return the NEW record for AFTER triggers
end;
$$;

-- Grant execute permission on the function to the authenticated role (or appropriate role)
-- grant execute on function public.handle_request_status_update() to authenticated;

-- Grant usage on the net schema to postgres role or the role running the trigger function
-- grant usage on schema net to postgres;
-- grant execute on all functions in schema net to postgres;
-- Drop existing trigger first if it exists (optional, good practice for idempotency)
drop trigger if exists on_request_status_update_trigger on public.team_change_requests;

-- Create the trigger that executes the function
create trigger on_request_status_update_trigger
after update on public.team_change_requests
for each row
when (old.status is distinct from new.status and new.status in ('payment_complete', 'ready_for_execution'))
execute function public.handle_request_status_update();
