import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Client, Environment } from 'square';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    const { sourceId, amount, idempotencyKey, note, referenceId } = await req.json();

    // Initialize Square client
    const client = new Client({
      accessToken: Deno.env.get('SQUARE_ACCESS_TOKEN'),
      environment: Deno.env.get('SQUARE_ENVIRONMENT') === 'production' 
        ? Environment.Production 
        : Environment.Sandbox
    });

    // Create payment
    const response = await client.paymentsApi.createPayment({
      sourceId,
      amountMoney: {
        amount: BigInt(amount * 100), // Convert to cents
        currency: 'USD'
      },
      idempotencyKey,
      locationId: Deno.env.get('SQUARE_LOCATION_ID'),
      note,
      referenceId
    });

    return new Response(
      JSON.stringify({ 
        payment: response.result.payment 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    );
  } catch (error) {
    console.error('Payment processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Payment processing failed' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
}); 