import { Client, Environment } from 'square';
import { PaymentMetadata } from '../types/payment';

// Initialize Square client
const client = new Client({
  accessToken: import.meta.env.VITE_SQUARE_ACCESS_TOKEN || '',
  environment: import.meta.env.VITE_SQUARE_ENVIRONMENT === 'production' 
    ? Environment.Production 
    : Environment.Sandbox
});

interface CreatePaymentParams {
  sourceId: string;
  amount: number;
  idempotencyKey: string;
  note?: string;
  referenceId?: string;
}

export async function createPayment({
  sourceId,
  amount,
  idempotencyKey,
  note,
  referenceId
}: CreatePaymentParams) {
  try {
    if (!import.meta.env.VITE_SQUARE_LOCATION_ID) {
      throw new Error('Square Location ID is not configured');
    }

    const response = await client.paymentsApi.createPayment({
      sourceId,
      amountMoney: {
        amount: BigInt(amount * 100), // Convert dollars to cents
        currency: 'USD'
      },
      idempotencyKey,
      locationId: import.meta.env.VITE_SQUARE_LOCATION_ID,
      note,
      referenceId
    });

    if (!response?.result?.payment) {
      throw new Error('Payment creation failed: No payment data received');
    }

    return response.result.payment;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
} 