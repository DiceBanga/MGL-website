export function validatePaymentAmount(amount: number): boolean {
  // Amount must be positive and have no more than 2 decimal places
  return amount > 0 && Number(amount.toFixed(2)) === amount;
}

export function validateZipCode(zipCode: string): boolean {
  // US ZIP code validation (5 digits)
  return /^\d{5}$/.test(zipCode);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function sanitizePaymentData(data: Record<string, any>): Record<string, any> {
  // Remove sensitive data before logging
  const sanitized = { ...data };
  delete sanitized.cardNumber;
  delete sanitized.cvv;
  delete sanitized.cardholderName;
  return sanitized;
}