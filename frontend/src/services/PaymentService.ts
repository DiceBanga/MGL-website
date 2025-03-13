import { PaymentForm } from 'react-square-web-payments-sdk';
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
      if (!this.validatePaymentAmount(amount)) {
        return {
          success: false,
          error: { message: 'Invalid payment amount' }
        };
      }

      if (!this.validateZipCode(zipCode)) {
        return {
          success: false,
          error: { message: 'Invalid ZIP code' }
        };
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceId,
          amount,
          zipCode
        })
      });

      const data = await response.json();
      return response.ok ? { success: true, payment: data } : { success: false, error: data.error };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Payment processing failed' }
      };
    }
  }

  private validatePaymentAmount(amount: number): boolean {
    return amount > 0 && Number.isFinite(amount) && Number(amount.toFixed(2)) === amount;
  }

  private validateZipCode(zipCode: string): boolean {
    return /^\d{5}$/.test(zipCode);
  }
}

export const paymentService = new PaymentService(); 