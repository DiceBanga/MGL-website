import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Client, Environment } from 'square';

// Update the corsHeaders to be more permissive during development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // More permissive for development
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': '*',  // More permissive for development
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

serve(async (req) => {
  console.log(`Function called with method: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // For testing, also allow GET requests
    if (req.method === 'GET') {
      console.log('GET request received - returning test response');
      return new Response(
        JSON.stringify({ 
          message: 'Create payment function is working!' 
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        }
      );
    }

    // Validate request method
    if (req.method !== 'POST') {
      console.log(`Invalid method: ${req.method}`);
      throw new Error('Method not allowed');
    }

    // Parse request body safely
    let body;
    try {
      body = await req.json();
      console.log('Request body:', JSON.stringify(body));
    } catch (e) {
      console.error('Error parsing request body:', e);
      throw new Error('Invalid request body');
    }

    const { sourceId, amount, idempotencyKey, note, referenceId } = body;

    // Validate required fields
    if (!sourceId || !amount || !idempotencyKey) {
      console.log('Missing required fields');
      throw new Error('Missing required fields');
    }

    // Initialize Square client
    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const environment = Deno.env.get('SQUARE_ENVIRONMENT');
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');

    if (!accessToken || !environment || !locationId) {
      console.log('Missing environment variables');
      throw new Error('Missing required environment variables');
    }

    console.log('Creating Square client with environment:', environment);
    const client = new Client({
      accessToken,
      environment: environment === 'production' 
        ? Environment.Production 
        : Environment.Sandbox
    });

    // Create payment
    console.log('Calling Square API to create payment');
    const response = await client.paymentsApi.createPayment({
      sourceId,
      amountMoney: {
        amount: BigInt(amount * 100), // Convert to cents
        currency: 'USD'
      },
      idempotencyKey,
      locationId,
      note,
      referenceId
    });

    console.log('Payment successful:', JSON.stringify(response.result));
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
        error: error.message || 'Payment processing failed',
        details: error.toString()
      }),
      { 
        status: error.status || 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
}); 