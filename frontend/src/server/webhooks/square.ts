import { verifySquareSignature } from '../utils/square-utils';
import { supabase } from '../../lib/supabase';

export async function handleSquareWebhook(req, res) {
  try {
    // Verify webhook signature
    const signature = req.headers['x-square-signature'];
    if (!verifySquareSignature(signature, req.body)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle different event types
    switch (event.type) {
      case 'payment.updated':
        await handlePaymentUpdate(event.data.object);
        break;
      case 'refund.updated':
        await handleRefundUpdate(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handlePaymentUpdate(payment) {
  // First update the payment record
  const { data: paymentData, error } = await supabase
    .from('payments')
    .update({
      status: payment.status,
      updated_at: new Date().toISOString(),
      metadata: { 
        ...payment.metadata,
        squarePayment: payment 
      }
    })
    .eq('payment_id', payment.id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating payment:', error);
    throw error;
  }

  // If payment is completed, process any associated requests
  if (payment.status === 'COMPLETED' && paymentData) {
    await processCompletedPayment(paymentData);
  }
}

async function processCompletedPayment(paymentData) {
  try {
    const metadata = paymentData.metadata || {};
    const paymentDetails = paymentData.payment_details || {};
    
    // Check if this is a team transfer payment
    if (metadata.event_type === 'team_transfer' || paymentDetails.type === 'team_transfer') {
      await processTeamTransfer(paymentData);
    } else if (metadata.event_type === 'tournament' || paymentDetails.type === 'tournament') {
      await processTournamentRegistration(paymentData);
    } else if (metadata.event_type === 'league' || paymentDetails.type === 'league') {
      await processLeagueRegistration(paymentData);
    }
  } catch (error) {
    console.error('Error processing completed payment:', error);
  }
}

async function processTeamTransfer(paymentData) {
  try {
    const metadata = paymentData.metadata || {};
    const paymentDetails = paymentData.payment_details || {};
    
    // Get team ID and player ID from metadata or payment details
    const teamId = metadata.team_id || paymentDetails.teamId;
    const playerId = metadata.playerId || paymentDetails.playerId;
    const requestId = metadata.request_id || paymentDetails.request_id;
    
    if (!teamId || !playerId) {
      console.error('Missing team ID or player ID for team transfer:', paymentData);
      return;
    }
    
    console.log(`Processing team transfer: Team ${teamId} to new captain ${playerId}`);
    
    // 1. Update the team_change_requests status to approved if request ID is available
    if (requestId) {
      const { error: requestError } = await supabase
        .from('team_change_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);
        
      if (requestError) {
        console.error('Error updating team change request:', requestError);
      }
    }
    
    // 2. Get the current captain ID
    const { data: teamData, error: teamFetchError } = await supabase
      .from('teams')
      .select('captain_id')
      .eq('id', teamId)
      .single();
      
    if (teamFetchError) {
      console.error('Error fetching team data:', teamFetchError);
      return;
    }
    
    const oldCaptainId = teamData.captain_id;
    
    // 3. Update the team captain
    const { error: teamError } = await supabase
      .from('teams')
      .update({ captain_id: playerId })
      .eq('id', teamId);
      
    if (teamError) {
      console.error('Error updating team captain:', teamError);
      return;
    }
    
    // 4. Update team_players roles
    // First, update the old captain's role to 'player'
    if (oldCaptainId) {
      const { error: oldCaptainError } = await supabase
        .from('team_players')
        .update({ role: 'player' })
        .eq('team_id', teamId)
        .eq('user_id', oldCaptainId);
        
      if (oldCaptainError) {
        console.error('Error updating old captain role:', oldCaptainError);
      }
    }
    
    // Then, update the new captain's role to 'captain'
    const { error: newCaptainError } = await supabase
      .from('team_players')
      .update({ role: 'captain' })
      .eq('team_id', teamId)
      .eq('user_id', playerId);
      
    if (newCaptainError) {
      console.error('Error updating new captain role:', newCaptainError);
    }
    
    console.log('Team ownership transfer completed successfully');
  } catch (error) {
    console.error('Error processing team transfer:', error);
  }
}

async function processTournamentRegistration(paymentData) {
  try {
    const metadata = paymentData.metadata || {};
    const paymentDetails = paymentData.payment_details || {};
    
    const tournamentId = metadata.event_id || paymentDetails.eventId;
    const teamId = metadata.team_id || paymentDetails.teamId;
    
    if (!tournamentId || !teamId) {
      console.error('Missing tournament ID or team ID for tournament registration:', paymentData);
      return;
    }
    
    const { error: regError } = await supabase
      .from('tournament_registrations')
      .update({ 
        status: 'approved',
        payment_status: 'paid'
      })
      .eq('tournament_id', tournamentId)
      .eq('team_id', teamId);
      
    if (regError) {
      console.error('Error updating tournament registration:', regError);
    }
  } catch (error) {
    console.error('Error processing tournament registration:', error);
  }
}

async function processLeagueRegistration(paymentData) {
  try {
    const metadata = paymentData.metadata || {};
    const paymentDetails = paymentData.payment_details || {};
    
    const leagueId = metadata.event_id || paymentDetails.eventId;
    const teamId = metadata.team_id || paymentDetails.teamId;
    
    if (!leagueId || !teamId) {
      console.error('Missing league ID or team ID for league registration:', paymentData);
      return;
    }
    
    const { error: regError } = await supabase
      .from('league_registrations')
      .update({ 
        status: 'approved',
        payment_status: 'paid'
      })
      .eq('league_id', leagueId)
      .eq('team_id', teamId);
      
    if (regError) {
      console.error('Error updating league registration:', regError);
    }
  } catch (error) {
    console.error('Error processing league registration:', error);
  }
}

async function handleRefundUpdate(refund) {
  const { error } = await supabase
    .from('refunds')
    .update({
      status: refund.status,
      updated_at: new Date().toISOString(),
      metadata: { squareRefund: refund }
    })
    .eq('refund_id', refund.id);

  if (error) {
    console.error('Error updating refund:', error);
    throw error;
  }
}