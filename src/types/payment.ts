export interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: 'square' | 'cashapp';
  paymentId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  payment?: PaymentDetails;
  error?: PaymentError;
}