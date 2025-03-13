import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Test a single endpoint
 */
async function testEndpoint(url: string, data: any, method: string = 'POST'): Promise<{success: boolean, data?: any, error?: any}> {
  try {
    // First, check if the endpoint is reachable with an OPTIONS request (preflight)
    const optionsResponse = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    // For OPTIONS requests, we only care about the status code and CORS headers
    if (method === 'OPTIONS') {
      return {
        success: optionsResponse.ok && 
                optionsResponse.headers.get('Access-Control-Allow-Origin') !== null &&
                optionsResponse.headers.get('Access-Control-Allow-Methods') !== null,
        data: {
          status: optionsResponse.status,
          headers: {
            'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers')
          }
        }
      };
    }
    
    // Now try the actual POST request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
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
    
    const responseData = await response.json();
    return {
      success: true,
      data: responseData
    };
  } catch (error: any) {
    if (error.message.includes('Failed to fetch')) {
      console.warn('Backend server appears to be offline');
      return {
        success: false,
        error: {
          message: 'Backend server offline',
          original: error.message
        }
      };
    }
    return {
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    };
  }
}

describe('Payment Endpoint Tests', () => {
  const testData = {
    sourceId: 'test-card-nonce',
    amount: 10.00,
    idempotencyKey: `test-${Date.now()}`,
    note: 'Test payment',
    referenceId: `test-payment-${Date.now()}`
  };

  const endpoints = [
    'http://localhost:8000/api/payments',
    'http://localhost:8000/api/payments/test'
  ];

  beforeAll(() => {
    console.log('\nNote: These tests require the backend server to be running.');
    console.log('Start the server with: cd backend && python -m uvicorn main:app --reload\n');
  });

  endpoints.forEach(endpoint => {
    describe(`Testing endpoint: ${endpoint}`, () => {
      it('should handle OPTIONS preflight request', async () => {
        const result = await testEndpoint(endpoint, testData, 'OPTIONS');
        if (result.error?.message === 'Backend server offline') {
          console.warn(`Backend server not running at ${endpoint}. Skipping test.`);
          return;
        }
        expect(result.success).toBe(true);
        if (result.data) {
          expect(result.data.headers['Access-Control-Allow-Origin']).toBeDefined();
          expect(result.data.headers['Access-Control-Allow-Methods']).toBeDefined();
        }
      });

      it('should process payment request', async () => {
        const result = await testEndpoint(endpoint, testData, 'POST');
        if (result.error?.message === 'Backend server offline') {
          console.warn(`Backend server not running at ${endpoint}. Skipping test.`);
          return;
        }
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it('should handle invalid payment data', async () => {
        const invalidData = { ...testData, amount: -100 };
        const result = await testEndpoint(endpoint, invalidData, 'POST');
        if (result.error?.message === 'Backend server offline') {
          console.warn(`Backend server not running at ${endpoint}. Skipping test.`);
          return;
        }
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
}); 