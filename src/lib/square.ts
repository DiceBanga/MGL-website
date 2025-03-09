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
    // Use direct fetch instead of supabase.functions.invoke
    const functionUrl = 'https://rwqskykpyjvflbiwgcue.supabase.co/functions/v1/create-payment';
    
    // Get the session for auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
        // Include supabase specific headers
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        sourceId,
        amount,
        idempotencyKey,
        note,
        referenceId
      })
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.error || errorText;
      } catch (e) {
        // Keep original error text if parsing fails
      }
      
      console.error('Error response from function:', response.status, errorText);
      throw new Error(`Failed to process payment: ${errorText}`);
    }

    const data = await response.json();
    
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