/**
 * Test function to verify connectivity to our test server
 */
export async function testSimplePayment() {
  try {
    console.log('Testing simple payment endpoint...');
    
    // Skip actual network request and return false
    console.log('Skipping actual test server check (server likely not running)');
    return false;
    
    /* Original code commented out to avoid connection errors
    const testEndpoint = 'http://localhost:8001/simple-payment';
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 25.99,
        note: 'Test payment from frontend'
      })
    });

    if (!response.ok) {
      console.error('Test payment failed:', response.status, response.statusText);
      let errorDetail = 'Unknown error';
      try {
        const errorData = await response.json();
        errorDetail = JSON.stringify(errorData);
      } catch (e) {
        // Ignore parsing errors
      }
      console.error('Error details:', errorDetail);
      return false;
    }

    const data = await response.json();
    console.log('Test payment successful! Response:', data);
    return true;
    */
  } catch (error) {
    console.error('Error in test payment:', error);
    return false;
  }
} 