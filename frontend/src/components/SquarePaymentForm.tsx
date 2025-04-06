import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CreditCard, AlertCircle } from 'lucide-react';
import { squarePaymentService } from '../services/SquarePaymentService';
import { PaymentForm } from 'react-square-web-payments-sdk';
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
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [teamOwnerCertified, setTeamOwnerCertified] = useState(false);

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
      
      // Validate checkboxes
      if (!teamOwnerCertified) {
        throw new Error('You must certify that you are the team owner or authorized by the captain');
      }
      if (!termsAccepted) {
        throw new Error('You must accept the Rules, Terms & Conditions, and Privacy Policy');
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
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="cardholder-name">
            Cardholder Name
          </label>
          <input
            id="cardholder-name"
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white"
            placeholder="Enter cardholder name"
            aria-label="Cardholder Name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="card-container">
            Card Details
          </label>
          <div 
            id="card-container"
            className="bg-gray-700 border border-gray-600 rounded-md p-4"
            aria-label="Credit Card Input Field"
          ></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="zip-code">
            ZIP Code
          </label>
          <input
            id="zip-code"
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
            placeholder="Enter ZIP code"
            aria-label="ZIP Code"
            required
          />
        </div>

        {/* Certifications */}
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="teamOwnerCertification"
                type="checkbox"
                checked={teamOwnerCertified}
                onChange={(e) => setTeamOwnerCertified(e.target.checked)}
                className="w-4 h-4 border-gray-600 rounded bg-gray-700 text-green-500 focus:ring-green-500"
                required
              />
            </div>
            <label htmlFor="teamOwnerCertification" className="ml-3 text-sm text-gray-300">
              I certify that I am the Team Owner or a member of this team that has been authorized by the captain to make changes to this team using Team Management.
            </label>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="termsAcceptance"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 border-gray-600 rounded bg-gray-700 text-green-500 focus:ring-green-500"
                required
              />
            </div>
            <label htmlFor="termsAcceptance" className="ml-3 text-sm text-gray-300">
              I certify that I have read and accepted the <a href="/rules" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400">Rules</a>, <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400">Terms & Conditions</a>, and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400">Privacy Policy</a>.
            </label>
          </div>
        </div>

        <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4 flex items-start">
          <Lock className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-green-400">
            Your payment information is encrypted and secure
          </p>
        </div>

      </form>
    </div>
  );
}