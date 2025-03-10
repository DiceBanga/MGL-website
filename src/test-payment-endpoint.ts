/**
 * Payment Endpoint Test Script
 * 
 * This script tests the connectivity between frontend and backend payment endpoints.
 * It attempts to reach the backend endpoint and submit simulated payment data.
 * 
 * Usage:
 * 1. Run your frontend development server (npm run dev)
 * 2. Make sure your backend server is running
 * 3. Open the browser console and execute: import('/src/test-payment-endpoint.ts').then(m => m.testPaymentEndpoint())
 */

// Configuration - adjust these as needed
const CONFIG = {
  // Backend endpoints to test (in order of preference)
  endpoints: [
    'http://localhost:8000/api/square-test-payment',
    'http://localhost:8000/api/payments',
    'http://localhost:8000/square-test-payment',
    'http://localhost:8000/payments',
    'http://127.0.0.1:8000/api/payments',
    'http://0.0.0.0:8000/api/payments'
  ],
  
  // Test data that simulates a payment form submission
  testPaymentData: {
    sourceId: 'cnon:card-nonce-ok', // Test nonce that works in Square sandbox
    amount: 150,
    idempotencyKey: `test-${Date.now()}`,
    note: 'Test payment from frontend test script',
    referenceId: `test-payment-${Date.now()}`
  }
};

/**
 * Test a single endpoint
 */
async function testEndpoint(url: string, data: any): Promise<{success: boolean, data?: any, error?: any}> {
  console.log(`Testing endpoint: ${url}`);
  
  try {
    // First, check if the endpoint is reachable with an OPTIONS request (preflight)
    const optionsResponse = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    if (!optionsResponse.ok) {
      console.warn(`❌ OPTIONS preflight failed for ${url}: ${optionsResponse.status} ${optionsResponse.statusText}`);
    } else {
      console.log(`✅ OPTIONS preflight successful for ${url}`);
    }
    
    // Now try the actual POST request
    console.log(`Sending payment data to: ${url}`);
    console.log('Payment data:', data);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      // Try to get error details if available
      let errorDetail = await response.text();
      try {
        errorDetail = JSON.parse(errorDetail);
      } catch (e) {
        // If it's not JSON, keep it as text
      }
      
      return {
        success: false,
        error: {
          status: response.status,
          statusText: response.statusText,
          detail: errorDetail
        }
      };
    }
    
    // Parse the successful response
    const responseData = await response.json();
    return {
      success: true,
      data: responseData
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    };
  }
}

/**
 * Test all configured endpoints until one succeeds
 */
export async function testPaymentEndpoint() {
  console.log('=== Starting Payment Endpoint Test ===');
  console.log(`Testing ${CONFIG.endpoints.length} possible endpoints...`);
  
  let successfulEndpoint = null;
  let successResult = null;
  
  // Try each endpoint in turn
  for (const endpoint of CONFIG.endpoints) {
    const result = await testEndpoint(endpoint, CONFIG.testPaymentData);
    
    if (result.success) {
      console.log(`✅ SUCCESS with endpoint: ${endpoint}`);
      console.log('Response:', result.data);
      successfulEndpoint = endpoint;
      successResult = result;
      break;
    } else {
      console.error(`❌ FAILED with endpoint: ${endpoint}`);
      console.error('Error:', result.error);
    }
  }
  
  if (successfulEndpoint) {
    console.log('\n=== Payment Endpoint Test Successful ===');
    console.log(`Working endpoint: ${successfulEndpoint}`);
    console.log('Use this endpoint in your application configuration');
    
    // Return the successful results for further processing if needed
    return {
      endpoint: successfulEndpoint,
      result: successResult
    };
  } else {
    console.error('\n=== Payment Endpoint Test Failed ===');
    console.error('None of the tested endpoints worked.');
    console.error('Please check that:');
    console.error('1. Your backend server is running');
    console.error('2. CORS is properly configured on the backend');
    console.error('3. The payment endpoints are correctly implemented');
    
    return {
      endpoint: null,
      result: null
    };
  }
}

// Auto-run the test if this script is loaded directly in a browser
if (typeof window !== 'undefined') {
  console.log('Payment Endpoint Test script loaded.');
  console.log('Run the test by executing: testPaymentEndpoint()');
} 