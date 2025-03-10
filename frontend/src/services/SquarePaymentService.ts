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

      if (dbError) throw dbError;

      // Process payment with Square API
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId,
          amount: paymentDetails.amount,
          idempotencyKey: uuidv4()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Update payment record to failed
        await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            metadata: {
              ...paymentRecord.metadata,
              error: errorData.message
            }
          })
          .eq('id', paymentRecord.id);

        throw new Error(errorData.message || 'Payment processing failed');
      }

      const data = await response.json();

      // Verify payment status
      if (!data.success || data.payment.status !== 'COMPLETED') {
        // Update payment record to failed
        await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            metadata: {
              ...paymentRecord.metadata,
              error: `Payment failed with status: ${data.payment?.status || 'unknown'}`
            }
          })
          .eq('id', paymentRecord.id);

        throw new Error(`Payment failed with status: ${data.payment?.status || 'unknown'}`);
      }

      // Update payment record to completed
      await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          payment_id: data.payment.id,
          metadata: {
            ...paymentRecord.metadata,
            squarePaymentId: data.payment.id,
            receiptUrl: data.payment.receiptUrl
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
        paymentId: data.payment.id,
        receiptUrl: data.payment.receiptUrl
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