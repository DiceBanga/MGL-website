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
  square_response?: any; // Square payment response
}

export interface SquarePaymentResponse {
  id: string;
  status: string;
  amountMoney: {
    amount: bigint;
    currency: string;
  };
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
  referenceId?: string;
  note?: string;
  customerId?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  receiptUrl?: string;
  error?: string;
}
