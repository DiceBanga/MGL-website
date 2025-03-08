import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../lib/supabase';

interface SquarePaymentResponse {
  payment?: {
    id: string;
    status: string;
    receiptNumber?: string;
    receiptUrl?: string;
    orderId?: string;
    amountMoney?: {
      amount: number;
      currency: string;
    };
    cardDetails?: {
      card?: {
        last4: string;
        cardBrand: string;
        expMonth: number;
        expYear: number;
      };
    };
    createdAt: string;
  };
  errors?: Array<{
    category: string;
    code: string;
    detail: string;
  }>;
}

export async function paymentMetadataMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const originalSend = res.send;

  // Override res.send to intercept the response
  res.send = function (body: any): Response {
    try {
      const responseData: SquarePaymentResponse = typeof body === 'string' ? JSON.parse(body) : body;
      
      // Only store metadata for payment responses
      if (responseData.payment || responseData.errors) {
        const metadata = {
          payment_id: responseData.payment?.id || 'error',
          user_id: req.user?.id, // Assuming user is attached to request
          response_data: {
            transaction_id: responseData.payment?.id,
            status: responseData.payment?.status || 'error',
            amount: responseData.payment?.amountMoney?.amount,
            currency: responseData.payment?.amountMoney?.currency,
            card_last4: responseData.payment?.cardDetails?.card?.last4,
            card_brand: responseData.payment?.cardDetails?.card?.cardBrand,
            receipt_url: responseData.payment?.receiptUrl,
            created_at: responseData.payment?.createdAt || new Date().toISOString(),
            errors: responseData.errors,
            raw_response: responseData // Store complete response for debugging
          }
        };

        // Store metadata in Supabase
        supabase.from('payment_metadata')
          .insert(metadata)
          .then(({ error }) => {
            if (error) {
              console.error('Error storing payment metadata:', error);
            }
          })
          .catch(error => {
            console.error('Failed to store payment metadata:', error);
          });
      }

      // Call original send
      return originalSend.call(this, body);
    } catch (error) {
      console.error('Error in payment metadata middleware:', error);
      return originalSend.call(this, body);
    }
  };

  next();
}