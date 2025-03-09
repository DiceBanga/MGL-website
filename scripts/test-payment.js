// Import Square SDK
import { Client, Environment } from 'square';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // Check for environment variables
    if (!process.env.VITE_SQUARE_ACCESS_TOKEN) {
        throw new Error('VITE_SQUARE_ACCESS_TOKEN environment variable is not set');
    }

    if (!process.env.VITE_SQUARE_LOCATION_ID) {
        throw new Error('VITE_SQUARE_LOCATION_ID environment variable is not set');
    }

    // Create the Square client
    const client = new Client({
        accessToken: process.env.VITE_SQUARE_ACCESS_TOKEN,
        environment: Environment.Sandbox
    });

    // Generate a unique idempotency key
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    try {
        console.log('Initiating test payment...');
        console.log('Using location ID:', process.env.VITE_SQUARE_LOCATION_ID);
        
        // Create a payment
        const response = await client.paymentsApi.createPayment({
            sourceId: 'cnon:card-nonce-ok',
            amountMoney: {
                amount: BigInt(1000), // $10.00
                currency: 'USD'
            },
            idempotencyKey,
            locationId: process.env.VITE_SQUARE_LOCATION_ID,
            note: 'Test payment',
            referenceId: 'test-payment-' + new Date().toISOString()
        });
        
        if (!response?.result?.payment) {
            throw new Error('Payment creation failed: No payment data received');
        }

        console.log('✅ Payment successful!');
        console.log('Transaction ID:', response.result.payment.id);
        console.log('Status:', response.result.payment.status);
        console.log('Amount:', response.result.payment.amountMoney);
        
        return response;
    } catch (error) {
        console.error('❌ Payment failed:');
        
        if (error && typeof error === 'object') {
            console.error('Full error:', JSON.stringify(error, null, 2));
            
            if ('errors' in error) {
                const squareError = error;
                squareError.errors.forEach((err, index) => {
                    console.error(`Error ${index + 1}:`);
                    console.error('Detail:', err.detail);
                    console.error('Code:', err.code);
                    console.error('Category:', err.category);
                });
            }
        }
        
        throw new Error(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Run the test with proper error handling
main()
    .then(() => {
        console.log('Test completed successfully');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Test failed:');
        console.error(err);
        process.exit(1);
    });