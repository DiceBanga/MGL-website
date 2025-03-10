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
 * This implementation tries to use the real Square API endpoint for testing
 * Falls back to mock implementation if the real API is not available
 */
export async function createPayment(params: CreatePaymentParams) {
  try {
    console.log('Creating payment with real Square API...');
    console.log('Payment params:', params);
    
    // Try different ports and basic endpoints to rule out connectivity issues
    const testConfigurations = [
      { url: 'http://localhost:8000/ping', desc: 'Basic ping endpoint' },
      { url: 'http://localhost:8000/', desc: 'Root endpoint' },
      { url: 'http://127.0.0.1:8000/ping', desc: 'Basic ping with IP address' },
      { url: 'http://localhost:8001/ping', desc: 'Alternative port 8001' },
      { url: 'http://localhost:5000/ping', desc: 'Alternative port 5000' }
    ];
    
    for (const config of testConfigurations) {
      try {
        console.log(`Testing ${config.desc}: ${config.url}`);
        const testResponse = await fetch(config.url, {
          method: 'GET'
        });
        
        if (!testResponse.ok) {
          console.error(`Endpoint ${config.url} not reachable:`, testResponse.status, testResponse.statusText);
        } else {
          const testData = await testResponse.json();
          console.log(`Success! ${config.desc} response:`, testData);
        }
      } catch (testError) {
        console.error(`Error connecting to ${config.url}:`, testError);
      }
    }
    
    // Try both with and without /api prefix for the payment endpoint
    const possibleEndpoints = [
      'http://localhost:8000/square-test-payment',
      'http://localhost:8000/api/square-test-payment',
      'http://localhost:8000/payments',
      'http://localhost:8000/api/payments'
    ];
    
    let paymentResponse = null;
    let paymentData = null;
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying payment endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(params)
        });
        
        if (response.ok) {
          paymentResponse = response;
          paymentData = await response.json();
          console.log(`Success with endpoint ${endpoint}:`, paymentData);
          break;
        } else {
          console.error(`Payment endpoint ${endpoint} not working:`, response.status, response.statusText);
          try {
            const errorData = await response.json();
            console.error('Error details:', errorData);
          } catch (e) {
            console.error('No parseable error details');
          }
        }
      } catch (endpointError) {
        console.error(`Error connecting to ${endpoint}:`, endpointError);
      }
    }
    
    if (paymentData?.payment) {
      return paymentData.payment;
    }
    
    // Fall back to mock implementation if no endpoint worked
    console.warn('All real payment attempts failed, falling back to mock implementation');
    return await createMockPayment(params);
    
  } catch (error) {
    console.error('Error creating payment:', error);
    console.warn('Network error, falling back to mock implementation');
    
    // Fall back to mock implementation for development
    return await createMockPayment(params);
  }
}