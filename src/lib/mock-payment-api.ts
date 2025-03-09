/**
 * Mock Payment API
 * This completely bypasses real network requests for testing
 */

export interface MockPaymentParams {
  sourceId: string;
  amount: number;
  idempotencyKey: string;
  note?: string;
  referenceId?: string;
}

export async function createMockPayment(params: MockPaymentParams) {
  // Log the request
  console.log('Mock payment API called with:', params);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Create a mock payment object
  const { sourceId, amount, referenceId } = params;
  const mockPaymentId = `mock_${Date.now()}`;
  const mockReceipt = `https://squareup.com/receipt/mock/${mockPaymentId}`;
  
  // Return a detailed mock response
  return {
    id: mockPaymentId,
    status: 'COMPLETED',
    amount_money: {
      amount: Math.round(amount * 100), // In cents, rounded to avoid floating point issues
      currency: 'USD'
    },
    total_money: {
      amount: Math.round(amount * 100),
      currency: 'USD'
    },
    source_id: sourceId,
    receipt_url: mockReceipt,
    receiptUrl: mockReceipt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    card_details: {
      card: {
        last_4: "1111",
        brand: "VISA"
      },
      status: "CAPTURED"
    },
    location_id: "MOCK_LOCATION",
    reference_id: referenceId || "MOCK_REFERENCE",
    payment_id: mockPaymentId
  };
} 