import { PaymentForm } from 'react-square-web-payments-sdk';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { PaymentDetails, PaymentResult } from '../types/payment';
import { useAuthStore } from '../store/authStore';

export class SquarePaymentService {
  private payments: any = null;

  async createPayment(sourceId: string, paymentDetails: PaymentDetails): Promise<PaymentResult> {
    try {
      console.log('Creating payment with Square...', { sourceId, amount: paymentDetails.amount });
      console.log('Payment details for processing:', JSON.stringify(paymentDetails, null, 2));
      
      // For team transfers, log additional details
      if (paymentDetails.type === 'team_transfer') {
        console.log('Processing team transfer payment with details:', {
          teamId: paymentDetails.teamId,
          captainId: paymentDetails.captainId,
          newCaptainId: paymentDetails.playerId,
          requestId: paymentDetails.request_id,
          referenceId: paymentDetails.referenceId
        });
      }
      
      // Create pending payment record first
      const { data: paymentRecord, error: dbError } = await this.createPendingPaymentRecord(paymentDetails);

      if (dbError) {
        console.error('Database error creating payment record:', dbError);
        console.log('Continuing with payment processing despite DB record error');
      } else {
        console.log('Successfully created payment record:', paymentRecord);
      }

      if (!paymentDetails.referenceId) {
        throw new Error('Reference ID is required for payment processing');
      }

      // Create metadata with exactly the same structure that works for the database
      const minimalMetadata: Record<string, any> = {
        "transaction_details": {
          "processor_response": `pending-${Date.now()}`,
          "authorization_code": `pending-${Date.now()}`
        },
        "payment_method": {
          "type": "square",
          "last_four": "0000"
        },
        "team_id": paymentDetails.teamId,
        "event_type": paymentDetails.type
      };
      
      // If we have an event ID, include it
      if (paymentDetails.eventId) {
        minimalMetadata["event_id"] = paymentDetails.eventId;
      }

      // Create request payload with the provided reference ID
      const payload = {
        sourceId,
        amount: paymentDetails.amount,
        idempotencyKey: uuidv4(),
        note: paymentDetails.description,
        referenceId: paymentDetails.referenceId,
        metadata: minimalMetadata, // Use the minimal metadata
        // Original data is still included separately for backend use
        originalData: {
          type: paymentDetails.type,
          playerId: paymentDetails.playerId,
          request_id: paymentDetails.request_id,
          item_id: paymentDetails.item_id,
          captainId: paymentDetails.captainId,
          metadata: paymentDetails.metadata
        }
      };
      
      console.log('Payment request payload:', JSON.stringify(payload, null, 2));
      
      // Try the payment endpoints in order
      const possibleEndpoints = [
        '/api/payments',
        '/payments',
        '/api/payments/process'
      ];
      
      let response = null;
      let responseData = null;
      
      for (const ep of possibleEndpoints) {
        try {
          console.log(`Trying payment endpoint: ${ep}`);
          
          // Process payment with Square API
          response = await fetch(ep, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          
          if (response.ok) {
            responseData = await response.json();
            console.log(`Payment successful with endpoint: ${ep}`, responseData);
            break;
          } else {
            console.error(`Payment endpoint ${ep} not working:`, response.status, response.statusText);
            
            try {
              const errorText = await response.text();
              console.error('Error details:', errorText);
            } catch (e) {
              console.error('Could not parse error response');
            }
          }
        } catch (endpointError) {
          console.error(`Network error with ${ep}:`, endpointError);
        }
      }
      
      if (!responseData) {
        return {
          success: false,
          error: 'Failed to process payment with any endpoint'
        };
      }
      
      // Record successful payment in database
      console.log('Payment created successfully, recording in database...');
      await this.recordPaymentInDatabase(responseData, paymentDetails);
      
      // Return success response with payment details
      return {
        success: true,
        paymentId: responseData.payment?.id || responseData.id,
        receiptUrl: responseData.payment?.receipt_url || responseData.receipt_url
      };
    } catch (error) {
      console.error('Error in createPayment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  private async createPendingPaymentRecord(paymentDetails: PaymentDetails) {
    try {
      const { user } = useAuthStore.getState();
      if (!user?.id) {
        throw new Error('User ID is required for payment recording');
      }

      console.log('Raw payment details:', JSON.stringify(paymentDetails, null, 2));

      // Try with the absolute minimal structure from our database query example
      // This is the exact structure from a successful record
      const minimalMetadata: Record<string, any> = {
        "transaction_details": {
          "processor_response": `pending-${Date.now()}`,
          "authorization_code": `pending-${Date.now()}`
        },
        "payment_method": {
          "type": "square",
          "last_four": "0000"
        },
        "team_id": paymentDetails.teamId,
        "event_type": paymentDetails.type
      };
      
      // If we have an event ID, include it
      if (paymentDetails.eventId) {
        minimalMetadata["event_id"] = paymentDetails.eventId;
      }
      
      console.log('Using absolute minimal metadata structure:', JSON.stringify(minimalMetadata, null, 2));
      
      // Try with the proven minimal structure from the database example
      const result = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: paymentDetails.amount,
          currency: 'USD',
          status: 'pending',
          payment_method: 'square',
          description: paymentDetails.description,
          metadata: minimalMetadata,
          reference_id: paymentDetails.referenceId
        })
        .select()
        .single();
        
      if (result.error) {
        console.error('Payment record creation still failed:', result.error);
        // Let's try with ONLY transaction_details and payment_method
        return await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            amount: paymentDetails.amount,
            currency: 'USD',
            status: 'pending',
            payment_method: 'square',
            description: paymentDetails.description,
            metadata: {
              transaction_details: {
                processor_response: `pending-${Date.now()}`,
                authorization_code: `pending-${Date.now()}`
              },
              payment_method: {
                type: "square",
                last_four: "0000"
              }
            },
            reference_id: paymentDetails.referenceId
          })
          .select()
          .single();
      }
      
      return result;
    } catch (error) {
      console.error('Error creating pending payment record:', error);
      return { data: null, error };
    }
  }

  private async updatePaymentRecord(recordId: string, updates: any) {
    try {
      // If we're updating metadata, ensure it has the required structure
      if (updates.metadata) {
        // Make sure we preserve the required fields
        const { error: getError, data: existingRecord } = await supabase
          .from('payments')
          .select('metadata')
          .eq('id', recordId)
          .single();
          
        if (!getError && existingRecord && existingRecord.metadata) {
          // Ensure transaction_details and payment_method are preserved
          updates.metadata = {
            ...existingRecord.metadata, // Preserve all existing metadata fields
            ...updates.metadata, // Add the new fields
            // Ensure these required fields are always present
            transaction_details: updates.metadata.transaction_details || 
              existingRecord.metadata.transaction_details,
            payment_method: updates.metadata.payment_method || 
              existingRecord.metadata.payment_method
          };
        } else {
          // If we can't get the existing record, ensure the required fields exist
          updates.metadata = {
            ...updates.metadata,
            transaction_details: updates.metadata.transaction_details || {
              processor_response: updates.metadata.squarePaymentId || "completed",
              authorization_code: updates.metadata.squarePaymentId || `auth_${Date.now()}`
            },
            payment_method: updates.metadata.payment_method || {
              type: "square",
              last_four: "0000"
            }
          };
        }
      }
      
      const { error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', recordId);
        
      if (error) {
        console.error('Error updating payment record:', error);
      }
    } catch (error) {
      console.error('Exception updating payment record:', error);
    }
  }

  private async updateRegistrationStatus(paymentDetails: PaymentDetails) {
    try {
      if (paymentDetails.type === 'tournament' && paymentDetails.eventId && paymentDetails.teamId) {
        try {
          const { error: regError } = await supabase
            .from('tournament_registrations')
            .update({ 
              status: 'approved',
              payment_status: 'paid'
            })
            .eq('tournament_id', paymentDetails.eventId)
            .eq('team_id', paymentDetails.teamId);
            
          if (regError) {
            console.error('Error updating tournament registration:', regError);
          }
        } catch (regUpdateError) {
          console.error('Exception updating tournament registration:', regUpdateError);
        }
      } else if (paymentDetails.type === 'league' && paymentDetails.eventId && paymentDetails.teamId) {
        console.debug("[SquarePaymentService] paymentDetails.season:", paymentDetails.season);

        // Try to get season from paymentDetails.metadata
        let seasonNumber = 1;
        if (paymentDetails.metadata) {
          seasonNumber = paymentDetails.metadata.season
            || paymentDetails.metadata.custom_data?.season
            || paymentDetails.metadata.changeRequestData?.season
            || paymentDetails.metadata.changeRequestData?.metadata?.season
            || 1;
          console.debug("[SquarePaymentService] Extracted season from metadata:", seasonNumber);
        }

        if (paymentDetails.eventId) {
          const { data: leagueData, error: leagueError } = await supabase
            .from('leagues')
            .select('season, current_season')
            .eq('id', paymentDetails.eventId)
            .maybeSingle();

          if (leagueError) {
            console.error("Error fetching league season:", leagueError);
          } else if (leagueData) {
            seasonNumber = leagueData.season || leagueData.current_season || 1;
            console.debug("[SquarePaymentService] Fetched season from leagues table:", seasonNumber);
          }
        }

        console.debug("[SquarePaymentService] Upserting league registration with data:", {
          league_id: paymentDetails.eventId,
          team_id: paymentDetails.teamId,
          status: 'approved',
          payment_status: 'paid',
          season: seasonNumber || 1
        });

        try {
          // Always fetch the season from leagues table before insert/update
          let seasonNumber = 1;

          if (paymentDetails.eventId) {
            const { data: leagueData, error: leagueError } = await supabase
              .from('leagues')
              .select('season, current_season')
              .eq('id', paymentDetails.eventId)
              .maybeSingle();

            if (leagueError) {
              console.error("Error fetching league season:", leagueError);
            } else if (leagueData) {
              seasonNumber = leagueData.season || leagueData.current_season || 1;
              console.debug("[SquarePaymentService] Fetched season from leagues table:", seasonNumber);
            }
          }

          const { data: existing, error: fetchError } = await supabase
            .from('league_registrations')
            .select('id')
            .eq('league_id', paymentDetails.eventId)
            .eq('team_id', paymentDetails.teamId)
            .maybeSingle();

          if (fetchError) {
            console.error("Error checking existing league registration:", fetchError);
          }

          if (existing) {
            const { error: updateError } = await supabase
              .from('league_registrations')
              .update({
                status: 'approved',
                payment_status: 'paid',
                season: seasonNumber
              })
              .eq('id', existing.id);
            if (updateError) {
              console.error("Error updating league registration:", updateError);
            }
          } else {
            const { error: insertError } = await supabase
              .from('league_registrations')
              .insert({
                league_id: paymentDetails.eventId,
                team_id: paymentDetails.teamId,
                status: 'approved',
                payment_status: 'paid',
                season: seasonNumber
              });
            if (insertError) {
              console.error("Error inserting league registration:", insertError);
              console.debug("[SquarePaymentService] Data used for insert error:", {
                league_id: paymentDetails.eventId,
                team_id: paymentDetails.teamId,
                status: 'approved',
                payment_status: 'paid',
                season: seasonNumber
              });
            }
          }
        } catch (regUpdateError) {
          console.error('Exception updating league registration:', regUpdateError);
        }
      } else if (paymentDetails.type === 'team_transfer') {
        try {
          console.log('Processing team transfer payment with full details:', JSON.stringify(paymentDetails, null, 2));
          
          // Extract the necessary IDs from the payment details
          const teamId = paymentDetails.teamId;
          const playerId = paymentDetails.playerId;
          const paymentId = paymentDetails.id;
          
          console.log('Extracted IDs from payment details:');
          console.log('Team ID:', teamId);
          console.log('Player ID (new captain):', playerId);
          console.log('Payment ID:', paymentId);
          
          if (!teamId || !playerId) {
            console.error('Missing required IDs for team transfer:');
            console.error('Team ID present:', !!teamId);
            console.error('Player ID present:', !!playerId);
            return;
          }
          
          // Validate UUIDs
          const validateUUID = (id: string) => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(id);
          };
          
          if (!validateUUID(teamId)) {
            console.error('Invalid team ID format:', teamId);
            return;
          }
          
          if (!validateUUID(playerId)) {
            console.error('Invalid player ID format:', playerId);
            return;
          }
          
          // 1. Get the current captain ID
          console.log('Fetching team data for team ID:', teamId);
          const { data: teamData, error: teamFetchError } = await supabase
            .from('teams')
            .select('captain_id, name')
            .eq('id', teamId)
            .single();
            
          if (teamFetchError) {
            console.error('Error fetching team data:', teamFetchError);
            return;
          }
          
          const oldCaptainId = teamData.captain_id;
          console.log('Current captain ID (UUID format):', oldCaptainId);
          console.log('New captain ID (UUID format):', playerId);
          console.log('Team name:', teamData.name);
          
          if (!validateUUID(oldCaptainId)) {
            console.error('Invalid old captain ID format:', oldCaptainId);
            return;
          }
          
          /* Skip creating a team change request here, as it's already created in the Payments component */
          
          // 2. Directly update the team captain and roles
          console.log('Updating team captain directly...');
          
          // Update team captain
          const { error: updateTeamError } = await supabase
            .from('teams')
            .update({ captain_id: playerId })
            .eq('id', teamId);
            
          if (updateTeamError) {
            console.error('Error updating team captain:', updateTeamError);
            return;
          }
          
          // Update old captain's role
          const { error: updateOldCaptainError } = await supabase
            .from('team_players')
            .update({ 
              role: 'player',
              can_be_deleted: true 
            })
            .eq('team_id', teamId)
            .eq('user_id', oldCaptainId);
            
          if (updateOldCaptainError) {
            console.error('Error updating old captain role:', updateOldCaptainError);
            return;
          }
          
          // Update new captain's role
          const { error: updateNewCaptainError } = await supabase
            .from('team_players')
            .update({ 
              role: 'captain',
              can_be_deleted: false 
            })
            .eq('team_id', teamId)
            .eq('user_id', playerId);
            
          if (updateNewCaptainError) {
            console.error('Error updating new captain role:', updateNewCaptainError);
            return;
          }
          
          console.log('Team ownership transfer completed successfully via direct updates');
        } catch (transferError) {
          console.error('Exception during team transfer:', transferError);
        }
      }
    } catch (error) {
      console.error('Error updating registration status:', error);
    }
  }

  async createCard(): Promise<any> {
    try {
      // We don't need to initialize payments anymore since we're using react-square-web-payments-sdk
      return null;
    } catch (error) {
      console.error('Error creating card instance:', error);
      throw error;
    }
  }

  async tokenizeCard(card: any): Promise<string> {
    try {
      // This is now handled by the PaymentForm component
      throw new Error('Use PaymentForm component for card tokenization');
    } catch (error) {
      console.error('Error tokenizing card:', error);
      throw error;
    }
  }

  async verifyPayment(paymentId: string): Promise<boolean> {
    try {
      // Use the debug endpoint for verification
      const response = await fetch(`/debug/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      const data = await response.json();
      return data.success && data.status === 'COMPLETED';
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  private async recordPaymentInDatabase(responseData: any, paymentDetails: PaymentDetails) {
    try {
      // Extract payment data from the response
      const payment = responseData.payment || responseData;
      
      // Extract card details if available
      const cardDetails = payment.card_details || {};
      const card = cardDetails.card || {};
      const cardBrand = card.card_brand || 'square';
      const lastFour = card.last_4 || '0000';
      
      // Create a minimal valid metadata structure using the exact format that works
      const minimalMetadata: Record<string, any> = {
        "transaction_details": {
          "processor_response": payment.id,
          "authorization_code": payment.id
        },
        "payment_method": {
          "type": cardBrand.toLowerCase(),
          "last_four": lastFour
        },
        "team_id": paymentDetails.teamId,
        "event_type": paymentDetails.type
      };
      
      // If we have an event ID, include it
      if (paymentDetails.eventId) {
        minimalMetadata["event_id"] = paymentDetails.eventId;
      }
      
      console.log('Updating payment record with minimal metadata:', JSON.stringify(minimalMetadata, null, 2));
      
      // Find the payment record by reference ID
      const { data: existingPayment, error: findError } = await supabase
        .from('payments')
        .select('id')
        .eq('reference_id', paymentDetails.referenceId)
        .single();
        
      if (findError) {
        console.error('Error finding payment record:', findError);
        return null;
      }
      
      // Update the payment record
      const { data, error } = await supabase
        .from('payments')
        .update({
          payment_id: payment.id,
          status: 'completed',
          metadata: minimalMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.id)
        .select();
        
      if (error) {
        console.error('Error updating payment record:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Error recording payment in database:', err);
      return null;
    }
  }
}

export const squarePaymentService = new SquarePaymentService();