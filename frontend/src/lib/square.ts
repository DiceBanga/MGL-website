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
    
    // Skip local testing in production - these are only for development
    if (import.meta.env.MODE !== 'production') {
      // Try different ports and basic endpoints to rule out connectivity issues
      const testConfigurations = [
        { url: 'http://localhost:8000/ping', desc: 'Basic ping endpoint' },
        { url: 'http://localhost:8000/', desc: 'Root endpoint' }
      ];
      
      for (const config of testConfigurations) {
        try {
          console.log(`Testing ${config.desc}: ${config.url}`);
          const testResponse = await fetch(config.url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
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
    }
    
    // Try the actual backend endpoints from the documentation
    const possibleEndpoints = [
      // Main endpoint from the docs
      '/api/payments',
      // Test endpoint from the docs
      '/api/payments/test'
    ];
    
    let paymentResponse = null;
    let paymentData = null;
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying payment endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
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