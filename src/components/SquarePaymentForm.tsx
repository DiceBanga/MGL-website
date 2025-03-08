import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CreditCard, AlertCircle } from 'lucide-react';
import { squarePaymentService } from '../services/SquarePaymentService';
import type { payments } from '@square/web-payments-sdk';
import type { PaymentDetails } from '../types/payment';

interface SquarePaymentFormProps {
  paymentDetails: PaymentDetails;
  onSuccess: (paymentResult: any) => void;
  onError: (error: Error) => void;
}

export function SquarePaymentForm({ 
  paymentDetails,
  onSuccess, 
  onError 
}: SquarePaymentFormProps) {
  const navigate = useNavigate();
  const [card, setCard] = useState<payments.Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [zipCode, setZipCode] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initializePayment() {
      try {
        const card = await squarePaymentService.createCard();
        await card.attach('#card-container');
        
        if (mounted) {
          setCard(card);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize Square payments:', error);
        setError('Failed to initialize payment form');
        onError(error as Error);
      }
    }

    initializePayment();

    return () => {
      mounted = false;
      if (card) {
        card.destroy();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;

    setProcessing(true);
    setError(null);

    try {
      // Validate form
      if (!cardholderName.trim()) {
        throw new Error('Cardholder name is required');
      }
      if (!zipCode.trim() || zipCode.length !== 5) {
        throw new Error('Valid ZIP code is required');
      }

      // Tokenize card
      const token = await squarePaymentService.tokenizeCard(card);

      // Process payment with full payment details
      const result = await squarePaymentService.createPayment(token, paymentDetails);

      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      onSuccess(result);
      navigate('/payment-success', { 
        state: { 
          paymentId: result.paymentId,
          receiptUrl: result.receiptUrl 
        }
      });
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
      onError(err as Error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400">Loading payment form...</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Payment Details</h2>
        <p className="text-gray-400">{paymentDetails.description}</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-800/30 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Cardholder Name
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Card Details
          </label>
          <div 
            id="card-container"
            className="bg-gray-700 border border-gray-600 rounded-md p-4"
          ></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            ZIP Code
          </label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              if (value.length <= 5) {
                setZipCode(value);
              }
            }}
            maxLength={5}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white"
            required
          />
        </div>

        <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4 flex items-start">
          <Lock className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-green-400">
            Your payment information is encrypted and secure
          </p>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Pay ${paymentDetails.amount.toFixed(2)}
            </>
          )}
        </button>
      </form>
    </div>
  );
}