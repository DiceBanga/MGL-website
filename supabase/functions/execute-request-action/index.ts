// supabase/functions/execute-request-action/index.ts

// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Execute Request Action function booting up...')

// Define interfaces for expected data
interface RequestRecord {
  id: string;
  request_type: string;
  team_id?: string;
  requested_by?: string;
  metadata?: Record<string, any>;
  // Add other potential fields from team_change_requests table
  new_captain_id?: string; // For team_transfer
  old_captain_id?: string; // For team_transfer
  player_id?: string; // For roster_change, online_id_change
  new_role?: string; // For roster_change
  operation?: string; // For roster_change (add/remove/update)
  event_id?: string; // For registrations
  tournament_id?: string; // For tournament_registration
  league_id?: string; // For league_registration
  player_ids?: string[]; // For registrations
  new_name?: string; // For team_rebrand
  old_name?: string; // For team_rebrand
  new_online_id?: string; // For online_id_change
  old_online_id?: string; // For online_id_change
  platform?: string; // For online_id_change
  team_name?: string; // For team_creation
  captain_id?: string; // For team_creation
  // ... add any other fields used by actions
}

interface ActionResult {
  success: boolean;
  message: string;
  team_id: string;
  old_captain_id?: string;
  new_captain_id?: string;
  tournament_id?: string;
  player_count?: number;
}

async function updateRequestStatus(supabaseAdmin: any, requestId: string, status: string, result: Record<string, any> | null = null) {
  console.log(`Updating request ${requestId} status to ${status} with result:`, result);
  const updateData: { status: string; updated_at: string; metadata?: any; result?: any } = {
    status: status,
    updated_at: new Date().toISOString(),
  };

  // Merge existing metadata with new result/error info if provided
  if (result) {
    // Fetch existing metadata first to merge, not overwrite
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from('team_change_requests')
      .select('metadata')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      console.error(`Error fetching current metadata for request ${requestId}:`, fetchError);
      // Proceed without merging if fetch fails, log the error
    }

    const existingMetadata = currentRequest?.metadata || {};
    const resultKey = status === 'action_failed' ? 'error_details' : 'action_result';
    updateData.metadata = { ...existingMetadata, [resultKey]: result };
    // Also store the primary result directly if needed (optional, metadata might be sufficient)
    // updateData.result = result;
  }


  const { error: updateError } = await supabaseAdmin
    .from('team_change_requests')
    .update(updateData)
    .eq('id', requestId);

  if (updateError) {
    console.error(`Failed to update request ${requestId} status to ${status}:`, updateError);
    // Consider how to handle this failure - maybe retry or log for manual intervention
  } else {
    console.log(`Successfully updated request ${requestId} status to ${status}.`);
  }
}


serve(async (req: Request) => {
  let supabaseAdmin: SupabaseClient | null = null;
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log the incoming request
    console.log('Received request:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    const requestData = await req.json();
    console.log('Request body:', JSON.stringify(requestData, null, 2));

    // Ensure environment variables are available
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    // Create Supabase admin client
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Basic validation
    if (!requestData || !requestData.id || !requestData.request_type) {
      throw new Error('Invalid request data: missing required fields');
    }

    // Log that we're about to process
    console.log(`Processing ${requestData.request_type} request for ID: ${requestData.id}`);

    let actionResult: ActionResult | null = null;

    // Handle team transfer
    if (requestData.request_type === 'team_transfer') {
      if (!requestData.team_id || !requestData.metadata?.newCaptainName || !requestData.metadata?.oldCaptainName) {
        throw new Error('Missing required fields for team transfer');
      }

      console.log(`Executing team transfer for team ${requestData.team_id}`);
      console.log(`Old captain: ${requestData.metadata.oldCaptainName}`);
      console.log(`New captain: ${requestData.metadata.newCaptainName}`);

      // First get the user IDs from the emails/names
      const { data: oldCaptain, error: oldCaptainError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', requestData.metadata.oldCaptainName)
        .single();

      if (oldCaptainError || !oldCaptain) {
        throw new Error(`Could not find old captain with email ${requestData.metadata.oldCaptainName}`);
      }

      const { data: newCaptain, error: newCaptainError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', requestData.metadata.newCaptainName)
        .single();

      if (newCaptainError || !newCaptain) {
        throw new Error(`Could not find new captain with username ${requestData.metadata.newCaptainName}`);
      }

      const { error: transferError } = await supabaseAdmin.rpc('admin_transfer_team_ownership', {
        p_team_id: requestData.team_id,
        p_new_captain_id: newCaptain.id,
        p_old_captain_id: oldCaptain.id
      });

      if (transferError) {
        console.error('Transfer error:', transferError);
        throw transferError;
      }

      actionResult = {
        success: true,
        message: 'Team ownership transferred successfully',
        team_id: requestData.team_id,
        old_captain_id: oldCaptain.id,
        new_captain_id: newCaptain.id
      };

      // Update request status to completed
      const { error: updateError } = await supabaseAdmin
        .from('team_change_requests')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          processing_attempts: 1,
          metadata: {
            ...requestData.metadata,
            action_result: actionResult
          }
        })
        .eq('id', requestData.id);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        throw updateError;
      }
    }
    
    // Handle tournament registration
    else if (requestData.request_type === 'tournament_registration') {
      if (!requestData.team_id || !requestData.tournament_id || !requestData.metadata?.playerIds) {
        throw new Error('Missing required fields for tournament registration');
      }

      console.log(`Executing tournament registration for team ${requestData.team_id}`);
      console.log(`Tournament: ${requestData.tournament_id}`);
      console.log(`Players: ${JSON.stringify(requestData.metadata.playerIds)}`);

      // Get player IDs from metadata
      const playerIds = Array.isArray(requestData.metadata.playerIds) 
        ? requestData.metadata.playerIds 
        : [];

      // Call the register_for_tournament function
      const { error: registrationError } = await supabaseAdmin.rpc('register_for_tournament', {
        p_tournament_id: requestData.tournament_id,
        p_team_id: requestData.team_id,
        p_player_ids: playerIds
      });

      if (registrationError) {
        console.error('Registration error:', registrationError);
        throw registrationError;
      }

      actionResult = {
        success: true,
        message: 'Team successfully registered for tournament',
        team_id: requestData.team_id,
        tournament_id: requestData.tournament_id,
        player_count: playerIds.length
      };

      // Update request status to completed
      const { error: updateError } = await supabaseAdmin
        .from('team_change_requests')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          processing_attempts: 1,
          metadata: {
            ...requestData.metadata,
            action_result: actionResult
          }
        })
        .eq('id', requestData.id);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Action completed successfully',
        data: actionResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Try to update the request status to failed
    if (error.requestData?.id && supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('team_change_requests')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            last_error: error.message,
            processing_attempts: 1
          })
          .eq('id', error.requestData.id);
      } catch (updateError) {
        console.error('Failed to update request status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
})