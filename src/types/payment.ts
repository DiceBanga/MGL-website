export interface PaymentDetails {
  id: string;
  type: 'tournament' | 'league';
  name: string;
  amount: number;
  description: string;
  teamId?: string;
  eventId?: string;
  playersIds?: string[]; // Optional but can default to []
}

export interface PaymentMetadata {
  type: 'tournament' | 'league';
  eventId: string;
  teamId: string;
  playersIds: string[]; // Required to ensure proper data handling
  squarePaymentId?: string;
  receiptUrl?: string;
  error?: string;
}
