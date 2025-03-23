import { v4 as uuidv4 } from 'uuid';

interface PaymentDetailsOptions {
  amount: number;
  description: string;
  itemId: string;
  metadata?: Record<string, any>;
}

/**
 * Creates standardized payment details for all team actions
 */
export function createPaymentDetails(options: PaymentDetailsOptions) {
  const { amount, description, itemId, metadata = {} } = options;
  
  // Use the request_id as the reference_id if available, otherwise generate a new UUID
  const referenceId = metadata.request_id || uuidv4();
  
  return {
    amount,
    currency: 'USD',
    idempotency_key: uuidv4(),
    description,
    item_id: itemId,
    reference_id: referenceId,
    metadata: {
      ...metadata,
      created_at: new Date().toISOString()
    }
  };
}

/**
 * Formats currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Validates that a string is a valid UUID
 */
export function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
} 