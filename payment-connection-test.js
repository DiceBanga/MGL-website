// Simple script to test connection to the payment endpoints
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  baseUrl: 'http://localhost:8000',
  endpoints: [
    '/payments',
    '/api/payments',
    '/api/payments/process',
    '/api/payment-test'
  ],
  testData: {
    sourceId: 'cnon:card-nonce-ok',
    amount: 15.99,
    idempotencyKey: `test-${Date.now()}`,
    note: 'Test from Node.js script',
    referenceId: `ref-${uuidv4()}`
  }
};

// Function to test an endpoint
async function testEndpoint(endpoint) {
  const url = `${config.baseUrl}${endpoint}`;
  console.log(`\n---------------------------------------------`);
  console.log(`Testing endpoint: ${url}`);
  console.log(`---------------------------------------------`);
  
  try {
    console.log('Request data:', JSON.stringify(config.testData, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config.testData)
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Response data:');
      console.log(JSON.stringify(data, null, 2));
      return true;
    } else {
      let errorData;
      try {
        errorData = await response.json();
        console.log('Error details:');
        console.log(JSON.stringify(errorData, null, 2));
      } catch (e) {
        const text = await response.text();
        console.log('Error response (not JSON):');
        console.log(text);
      }
      return false;
    }
  } catch (error) {
    console.log(`Network error: ${error.message}`);
    return false;
  }
}

// Test all endpoints
async function runTests() {
  console.log('=================================================');
  console.log('PAYMENT API CONNECTION TEST');
  console.log('=================================================');
  
  let successCount = 0;
  
  for (const endpoint of config.endpoints) {
    const success = await testEndpoint(endpoint);
    if (success) successCount++;
  }
  
  console.log('\n=================================================');
  console.log(`Test results: ${successCount}/${config.endpoints.length} endpoints working`);
  console.log('=================================================');
}

// Run the tests
runTests().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
}); 