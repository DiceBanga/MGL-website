export interface PaymentDetails {
  id: string;
  type: 'tournament' | 'league' | 'team_transfer' | 'roster_change' | 'online_id_change' | 'team_rebrand' | 'player_signing';
  name: string;
  amount: number;
  description: string;
  teamId?: string;
  eventId?: string;
  captainId?: string;  // Added for reference ID generation
  playersIds?: string[]; // Optional but can default to []
  playerId?: string;    // Used for team transfers and online ID changes
  request_id?: string;  // Used for change requests
  referenceId?: string;
  item_id?: string;     // Item ID for the payment
  season?: number;      // Add season number for league registrations
  metadata?: Record<string, any>; // Additional metadata for specific payment types
}

export interface PaymentMetadata {
  type: 'tournament' | 'league' | 'team_transfer' | 'roster_change' | 'online_id_change' | 'team_rebrand' | 'player_signing';
  eventId?: string;
  teamId?: string;
  playersIds?: string[]; // Required to ensure proper data handling
  playerId?: string;     // Used for team transfers and online ID changes
  request_id?: string;   // Used for change requests
  item_id?: string;      // Item ID for the payment
  captainId?: string;    // Captain ID for team-related payments
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
