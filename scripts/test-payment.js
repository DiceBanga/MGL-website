// Import Square SDK
import 'dotenv/config';
import { SquareClient, SquareEnvironment } from 'square';

async function main() {
    // Check for environment variable
    if (!process.env.SQUARE_ACCESS_TOKEN) {
        console.error('Error: SQUARE_ACCESS_TOKEN environment variable is not set');
        console.log('Please set it with: export SQUARE_ACCESS_TOKEN=your_token_here');
        process.exit(1);
    }

    // Create the Square client
    const client = new SquareClient({
        environment: SquareEnvironment.Sandbox, // Use Sandbox for testing
        token: process.env.SQUARE_ACCESS_TOKEN,
    });

    // Generate a unique idempotency key
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    try {
        console.log('Initiating test payment...');
        
        // Create a payment
        const response = await client.payments.create({
            // For testing, use a sandbox-specific test card nonce
            // In production, this would come from Square.js in your frontend
            sourceId: 'cnon:card-nonce-ok',
            
            // Amount must be a BigInt for precise currency handling
            amountMoney: {
                amount: BigInt(1000), // $10.00
                currency: 'USD'
            },
            
            // Using our generated idempotency key to prevent duplicate payments
            idempotencyKey: idempotencyKey,
            
            // Additional optional fields
            note: 'Test payment',
            customerId: null, // You can add a customer ID here if needed
            
            // Include reference ID if needed for your own tracking
            referenceId: 'test-payment-' + new Date().toISOString(),
            
            // You can add shipping/billing details as needed
            // billingAddress: { ... },
            // shippingAddress: { ... },
        });
        
        console.log('✅ Payment successful!');
        console.log('Transaction ID:', response.payment.id);
        console.log('Status:', response.payment.status);
        console.log('Amount:', response.payment.amountMoney);
        
        return response;
    } catch (error) {
        console.error('❌ Payment failed:');
        
        // Log detailed error information
        if (error.errors) {
            error.errors.forEach((err, index) => {
                console.error(`Error ${index + 1}:`, err);
            });
        }
        
        throw error;
    }
}

// Run the test
main()
    .then(() => console.log('Test completed successfully'))
    .catch(err => {
        console.error('Test failed with error:', err.message);
        process.exit(1);
    });