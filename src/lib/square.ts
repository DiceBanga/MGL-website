import { createMockPayment } from './mock-payment-api';

interface CreatePaymentParams {
  sourceId: string;
  amount: number;
  idempotencyKey: string;
  note?: string;
  referenceId?: string;
}

/**
 * Create a payment using Square
 * For testing, this uses a mock implementation that doesn't make any network requests
 */
export async function createPayment(params: CreatePaymentParams) {
  try {
    console.log('Creating payment with mock API...');
    
    // Use our mock payment API instead of real network requests
    const payment = await createMockPayment(params);
    
    console.log('Mock payment created successfully:', payment);
    return payment;
  } catch (error) {
    console.error('Error creating payment:', error);
    if (error instanceof Error) {
      throw new Error(`Payment failed: ${error.message}`);
    } else {
      throw new Error('Payment failed: An unexpected error occurred');
    }
  }
}