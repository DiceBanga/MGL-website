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
      console.log('Original payment details:', paymentDetails);
      
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
        // Continue with payment processing even if DB record fails
      }

      if (!paymentDetails.referenceId) {
        throw new Error('Reference ID is required for payment processing');
      }

      // Create request payload with the provided reference ID
      const payload = {
        sourceId,
        amount: paymentDetails.amount,
        idempotencyKey: uuidv4(),
        note: paymentDetails.description,
        referenceId: paymentDetails.referenceId
      };
      
      console.log('Payment params:', payload);
      
      // Try the actual backend endpoints from the documentation
      const possibleEndpoints = [
        // Main endpoint from the docs
        '/api/payments',
        // Test endpoint from the docs
        '/api/payments/test'
      ];
      
      let response = null;
      let responseData = null;
      let endpoint = '';
      
      // Test basic connectivity first
      try {
        console.log('Testing Basic ping endpoint: http://localhost:8000/ping');
        const pingResponse = await fetch('http://localhost:8000/ping');
        if (pingResponse.ok) {
          console.log('Success! Basic ping endpoint response:', await pingResponse.json());
        }
      } catch (e) {
        console.error('Basic ping endpoint not working:', e);
      }
      
      // Test root endpoint
      try {
        console.log('Testing Root endpoint: http://localhost:8000/');
        const rootResponse = await fetch('http://localhost:8000/');
        if (rootResponse.ok) {
          console.log('Success! Root endpoint response:', await rootResponse.json());
        }
      } catch (e) {
        console.error('Root endpoint not working:', e);
      }
      
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
            console.log(`Success with endpoint ${ep}:`, responseData);
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
        paymentId: responseData.payment?.id,
        receiptUrl: responseData.payment?.receipt_url
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

      // Create a metadata object that satisfies the database constraint:
      // metadata must have transaction_details and payment_method as objects
      const validMetadata = {
        transaction_details: {
          processor_response: "pending",
          authorization_code: `pending_${Date.now()}`
        },
        payment_method: {
          type: "square",
          last_four: "0000"
        }
      };
      
      // Try with valid metadata structure
      const result = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: paymentDetails.amount,
          currency: 'USD',
          status: 'pending',
          payment_method: 'square',
          description: paymentDetails.description,
          metadata: validMetadata
        })
        .select()
        .single();
        
      if (result.error) {
        console.log('First attempt failed, trying with minimal metadata structure');
        // Try with minimal metadata structure - just the required fields
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
                processor_response: "pending",
                authorization_code: `pending_${Date.now()}`
              },
              payment_method: {
                type: "square",
                last_four: "0000"
              }
            }
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
            ...updates.metadata,
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
        try {
          const { error: regError } = await supabase
            .from('league_registrations')
            .update({ 
              status: 'approved',
              payment_status: 'paid'
            })
            .eq('league_id', paymentDetails.eventId)
            .eq('team_id', paymentDetails.teamId);
            
          if (regError) {
            console.error('Error updating league registration:', regError);
          }
        } catch (regUpdateError) {
          console.error('Exception updating league registration:', regUpdateError);
        }
      } else if (paymentDetails.type === 'team_transfer' && paymentDetails.teamId && paymentDetails.playerId && paymentDetails.request_id) {
        try {
          console.log('Processing team transfer payment:', paymentDetails);
          
          // 1. Update the team_change_requests status to approved
          const { error: requestError } = await supabase
            .from('team_change_requests')
            .update({ status: 'approved' })
            .eq('id', paymentDetails.request_id);
            
          if (requestError) {
            console.error('Error updating team change request:', requestError);
            return;
          }
          
          // 2. Get the current captain ID
          const { data: teamData, error: teamFetchError } = await supabase
            .from('teams')
            .select('captain_id')
            .eq('id', paymentDetails.teamId)
            .single();
            
          if (teamFetchError) {
            console.error('Error fetching team data:', teamFetchError);
            return;
          }
          
          const oldCaptainId = teamData.captain_id;
          
          // Create a server-side function to update the team captain
          // This is needed to bypass RLS policies
          const { error: functionError } = await supabase.rpc('transfer_team_ownership', {
            team_id: paymentDetails.teamId,
            new_captain_id: paymentDetails.playerId,
            old_captain_id: oldCaptainId
          });
          
          if (functionError) {
            console.error('Error calling transfer_team_ownership function:', functionError);
            
            // Fallback: Try to create a change request that can be approved by an admin
            const { error: adminRequestError } = await supabase
              .from('admin_requests')
              .insert({
                request_type: 'team_transfer',
                status: 'pending',
                metadata: {
                  team_id: paymentDetails.teamId,
                  new_captain_id: paymentDetails.playerId,
                  old_captain_id: oldCaptainId,
                  payment_id: paymentDetails.id,
                  request_id: paymentDetails.request_id
                }
              });
              
            if (adminRequestError) {
              console.error('Error creating admin request:', adminRequestError);
            } else {
              console.log('Created admin request for team transfer that requires manual approval');
            }
          } else {
            console.log('Team ownership transfer completed successfully via RPC function');
          }
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
      const { user } = useAuthStore.getState();
      if (!user?.id) {
        throw new Error('User ID is required for payment recording');
      }

      const metadata = {
        transaction_details: {
          processor_response: responseData.payment?.id || "completed",
          authorization_code: responseData.payment?.id || `auth_${Date.now()}`
        },
        payment_method: {
          type: "square",
          last_four: responseData.payment?.card_details?.card?.last_4 || "0000"
        },
        square_payment: responseData.payment,
        reference_id: paymentDetails.referenceId,
        event_type: paymentDetails.type,
        event_id: paymentDetails.eventId,
        team_id: paymentDetails.teamId,
        player_id: paymentDetails.playerId,
        request_id: paymentDetails.request_id,
        payment_details: paymentDetails // Store the entire payment details in metadata
      };

      const { error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: paymentDetails.amount,
          currency: 'USD',
          status: responseData.payment?.status || 'completed',
          payment_method: 'square',
          payment_id: responseData.payment?.id,
          description: paymentDetails.description,
          metadata: metadata
        });

      if (error) {
        console.error('Error recording payment in database:', error);
      } else {
        console.log('Payment recorded successfully, updating registration status...');
        // Update registration status based on payment type
        await this.updateRegistrationStatus(paymentDetails);
      }
    } catch (error) {
      console.error('Exception recording payment in database:', error);
    }
  }
}

export const squarePaymentService = new SquarePaymentService();