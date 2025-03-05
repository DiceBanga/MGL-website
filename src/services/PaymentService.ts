import { payments } from '@square/web-payments-sdk';
import { supabase } from '../lib/supabase';
import { paymentConfig } from '../config/payments';
import { validatePaymentAmount, validateZipCode, sanitizePaymentData } from '../utils/payment-validation';
import type { PaymentDetails, PaymentResponse } from '../types/payment';

export class PaymentService {
  private squarePayments: payments.Payments | null = null;

  async initializeSquare() {
    if (!this.squarePayments) {
      this.squarePayments = await payments.Payments(paymentConfig.square.applicationId, {
        environment: paymentConfig.square.environment
      });
    }
    return this.squarePayments;
  }

  private async logPaymentAttempt(data: Record<string, any>) {
    try {
      await supabase.from('payment_logs').insert({
        timestamp: new Date().toISOString(),
        data: sanitizePaymentData(data)
      });
    } catch (error) {
      console.error('Failed to log payment attempt:', error);
    }
  }

  async processPayment(sourceId: string, amount: number, zipCode: string): Promise<PaymentResponse> {
    try {
      // Validate inputs
      if (!validatePaymentAmount(amount)) {
        throw new Error('Invalid payment amount');
      }
      if (!validateZipCode(zipCode)) {
        throw new Error('Invalid ZIP code');
      }

      // Log payment attempt
      await this.logPaymentAttempt({ sourceId, amount, zipCode });

      // Create pending payment record
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

      if (dbError) {
        throw new Error('Failed to create payment record');
      }

      // Process payment with Square
      const response = await fetch('/api/payments/square', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          amount,
          locationId: paymentConfig.square.locationId,
          zipCode,
          paymentId: paymentRecord.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Update payment status to failed
        await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            error: data.error?.message || 'Payment processing failed'
          })
          .eq('id', paymentRecord.id);

        return {
          success: false,
          error: {
            code: data.error?.code || 'PAYMENT_FAILED',
            message: data.error?.message || 'Payment processing failed'
          }
        };
      }

      // Update payment status to completed
      await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          payment_id: data.payment.id
        })
        .eq('id', paymentRecord.id);

      return {
        success: true,
        payment: {
          id: paymentRecord.id,
          amount,
          currency: 'USD',
          status: 'completed',
          paymentMethod: 'square',
          paymentId: data.payment.id
        }
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: {
          code: 'PAYMENT_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      };
    }
  }

  async processCashAppPayment(amount: number, cashtag: string): Promise<PaymentResponse> {
    try {
      if (!validatePaymentAmount(amount)) {
        throw new Error('Invalid payment amount');
      }

      // Log payment attempt
      await this.logPaymentAttempt({ amount, cashtag });

      // Create pending payment record
      const { data: paymentRecord, error: dbError } = await supabase
        .from('payments')
        .insert({
          amount,
          payment_method: 'cashapp',
          status: 'pending',
          currency: 'USD'
        })
        .select()
        .single();

      if (dbError) {
        throw new Error('Failed to create payment record');
      }

      // Generate CashApp payment link
      const response = await fetch('/api/payments/cashapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          cashtag,
          paymentId: paymentRecord.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            error: data.error?.message || 'Payment processing failed'
          })
          .eq('id', paymentRecord.id);

        return {
          success: false,
          error: {
            code: data.error?.code || 'PAYMENT_FAILED',
            message: data.error?.message || 'Payment processing failed'
          }
        };
      }

      return {
        success: true,
        payment: {
          id: paymentRecord.id,
          amount,
          currency: 'USD',
          status: 'pending',
          paymentMethod: 'cashapp',
          metadata: {
            paymentUrl: data.paymentUrl
          }
        }
      };
    } catch (error) {
      console.error('CashApp payment error:', error);
      return {
        success: false,
        error: {
          code: 'PAYMENT_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      };
    }
  }
}

export const paymentService = new PaymentService();