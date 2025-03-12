import { v4 as uuidv4 } from 'uuid';
import { payments } from '@square/web-payments-sdk';
import { supabase } from '../lib/supabase';
import type { PaymentDetails } from '../types/payment';

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  receiptUrl?: string;
  error?: string;
}

export class SquarePaymentService {
  private payments: payments.Payments | null = null;

  async initialize(): Promise<payments.Payments> {
    if (!this.payments) {
      this.payments = await payments.Payments(
        import.meta.env.VITE_SQUARE_APP_ID,
        {
          environment: import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox'
        }
      );
    }
    return this.payments;
  }

  async createPayment(sourceId: string, paymentDetails: PaymentDetails): Promise<PaymentResult> {
    try {
      console.log('Creating payment with Square...', { sourceId, amount: paymentDetails.amount });
      
      // Create pending payment record first
      const { data: paymentRecord, error: dbError } = await supabase
        .from('payments')
        .insert({
          amount: paymentDetails.amount,
          currency: 'USD',
          status: 'pending',
          payment_method: 'square',
          description: paymentDetails.description,
          metadata: {
            type: paymentDetails.type,
            eventId: paymentDetails.eventId,
            teamId: paymentDetails.teamId,
            playersIds: paymentDetails.playersIds
          }
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error creating payment record:', dbError);
        throw dbError;
      }

      console.log('Created pending payment record:', paymentRecord);

      // Try multiple endpoints in case one doesn't work
      const possibleEndpoints = [
        '/api/payments/process',
        '/api/payments',
        '/payments'
      ];
      
      let response = null;
      let responseData = null;
      let endpoint = '';
      
      for (const ep of possibleEndpoints) {
        try {
          console.log(`Trying payment endpoint: ${ep}`);
          endpoint = ep;
          
          // Process payment with Square API
          response = await fetch(ep, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sourceId,
              amount: paymentDetails.amount,
              idempotencyKey: uuidv4(),
              note: paymentDetails.description,
              referenceId: `payment-${paymentRecord.id}`
            }),
          });
          
          if (response.ok) {
            responseData = await response.json();
            console.log(`Successful response from ${ep}:`, responseData);
            break;
          } else {
            console.error(`Error from ${ep}:`, response.status, response.statusText);
            
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
      
      // If all endpoints failed
      if (!response || !response.ok || !responseData) {
        // Update payment record to failed
        await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            metadata: {
              ...paymentRecord.metadata,
              error: 'Failed to connect to payment API'
            }
          })
          .eq('id', paymentRecord.id);

        throw new Error('All payment endpoints failed');
      }

      // Handle response format differences - some endpoints return { payment: {...} } and others might not
      const paymentResult = responseData.payment || responseData;
      
      // Verify payment status - normalize different status formats
      const paymentStatus = paymentResult.status || '';
      const isCompleted = ['COMPLETED', 'APPROVED', 'SUCCESS', 'SUCCEEDED'].includes(paymentStatus.toUpperCase());
      
      if (!isCompleted) {
        // Update payment record to failed
        await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            metadata: {
              ...paymentRecord.metadata,
              error: `Payment failed with status: ${paymentStatus || 'unknown'}`
            }
          })
          .eq('id', paymentRecord.id);

        throw new Error(`Payment failed with status: ${paymentStatus || 'unknown'}`);
      }

      // Update payment record to completed
      await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          payment_id: paymentResult.id,
          metadata: {
            ...paymentRecord.metadata,
            squarePaymentId: paymentResult.id,
            receiptUrl: paymentResult.receiptUrl || paymentResult.receipt_url
          }
        })
        .eq('id', paymentRecord.id);

      // If this is a registration payment, update the registration status
      if (paymentDetails.type === 'tournament') {
        await supabase
          .from('tournament_registrations')
          .update({ 
            status: 'approved',
            payment_status: 'paid'
          })
          .eq('tournament_id', paymentDetails.eventId)
          .eq('team_id', paymentDetails.teamId);
      } else if (paymentDetails.type === 'league') {
        await supabase
          .from('league_registrations')
          .update({ 
            status: 'approved',
            payment_status: 'paid'
          })
          .eq('league_id', paymentDetails.eventId)
          .eq('team_id', paymentDetails.teamId);
      }

      return {
        success: true,
        paymentId: paymentResult.id,
        receiptUrl: paymentResult.receiptUrl || paymentResult.receipt_url
      };
    } catch (error) {
      console.error('Payment error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  async createCard(): Promise<payments.Card> {
    const payments = await this.initialize();
    return await payments.card();
  }

  async tokenizeCard(card: payments.Card): Promise<string> {
    try {
      const result = await card.tokenize();
      if (result.status === 'OK') {
        return result.token;
      }
      throw new Error(result.errors?.[0]?.message || 'Card tokenization failed');
    } catch (error) {
      console.error('Tokenization error:', error);
      throw error;
    }
  }

  async verifyPayment(paymentId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/payments/verify/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
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
}

export const squarePaymentService = new SquarePaymentService();