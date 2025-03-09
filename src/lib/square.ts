import { supabase } from './supabase';

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
    // Call our Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('create-payment', {
      body: {
        sourceId,
        amount,
        idempotencyKey,
        note,
        referenceId
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Failed to process payment');
    }

    if (!data?.payment) {
      throw new Error('Payment creation failed: No payment data received');
    }

    return data.payment;
  } catch (error) {
    console.error('Error creating payment:', error);
    if (error instanceof Error) {
      throw new Error(`Payment failed: ${error.message}`);
    } else {
      throw new Error('Payment failed: An unexpected error occurred');
    }
  }
}