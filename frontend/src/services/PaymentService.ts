import { payments } from '@square/web-payments-sdk';
import { supabase } from '../lib/supabase';
import { paymentConfig } from '../config/payments';

export class PaymentService {
  private squarePayments: payments.Payments | null = null;

  async initializeSquare() {
    if (!this.squarePayments) {
      this.squarePayments = await payments.Payments(
        import.meta.env.VITE_SQUARE_APP_ID,
        {
          environment: 'sandbox'
        }
      );
    }
    return this.squarePayments;
  }

  async processPayment(sourceId: string, amount: number, zipCode: string) {
    try {
      console.log('Starting payment process:', { amount, zipCode });
      
      // First record the pending payment in Supabase
      const { data: paymentRecord, error: dbError } = await supabase
        .from('payments')
        .insert({
          amount,
          payment_method: 'square',
          status: 'pending',
          currency: 'USD'
        })
        .select()
        .single();

      console.log('Supabase payment record:', { paymentRecord, error: dbError });

      if (dbError) {
        console.error('Supabase error:', dbError);
        throw new Error('Failed to create payment record');
      }

      // Process payment with Square
      console.log('Sending request to Square API:', {
        sourceId,
        amount,
        locationId: import.meta.env.VITE_SQUARE_LOCATION_ID,
        zipCode,
        paymentId: paymentRecord.id
      });

      const response = await fetch('/api/payments/square', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId,
          amount,
          locationId: import.meta.env.VITE_SQUARE_LOCATION_ID,
          zipCode,
          paymentId: paymentRecord.id
        }),
      });

      const data = await response.json();
      console.log('Square API response:', { status: response.status, data });
      
      if (!response.ok) {
        console.error('Payment failed:', data);
        // Update payment status to failed
        const { error: updateError } = await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('id', paymentRecord.id);
        
        console.log('Updated payment status to failed:', { error: updateError });
        throw new Error(data.error || 'Payment processing failed');
      }

      // Update payment status to completed
      const { error: completeError } = await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          payment_id: data.payment.id
        })
        .eq('id', paymentRecord.id);

      console.log('Updated payment status to completed:', { error: completeError });
      return data;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService(); 