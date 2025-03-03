import React, { useEffect, useState } from 'react';
import { payments } from '@square/web-payments-sdk';
import { paymentService } from '../services/PaymentService';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

export enum PaymentType {
  CREDIT_CARD = 'credit_card',
  CASH_APP = 'cash_app'
}

interface SquarePaymentFormProps {
  amount: number;
  description?: string;
  leagueStartDate?: string;
  registrationFee?: number;
  onSuccess: (payment: any) => void;
  onError: (error: Error) => void;
  onCancel?: () => void;
  defaultPaymentType?: PaymentType;
}

export function SquarePaymentForm({ 
  amount, 
  description = 'test league',
  leagueStartDate,
  registrationFee = 0,
  onSuccess, 
  onError,
  onCancel,
  defaultPaymentType = PaymentType.CREDIT_CARD
}: SquarePaymentFormProps) {
  const navigate = useNavigate();
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState('');
  const [finalAmount, setFinalAmount] = useState(amount);
  const [paymentType, setPaymentType] = useState<PaymentType>(defaultPaymentType);

  useEffect(() => {
    let mounted = true;

    async function initializePayments() {
      try {
        const paymentsInstance = await payments.Payments(
          import.meta.env.VITE_SQUARE_APP_ID,
          {
            environment: 'sandbox'
          }
        );
        
        const card = await paymentsInstance.card({
          postalCode: false, // Disable built-in postal code field
        });
        await card.attach('#card-container');
        
        if (mounted) {
          setCard(card);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize Square payments:', error);
        setErrorMessage('Failed to initialize payment form');
        onError(error as Error);
      }
    }

    initializePayments();

    return () => {
      mounted = false;
      if (card) {
        card.destroy();
      }
    };
  }, []);

  useEffect(() => {
    // Check if registration is still open
    const isRegistrationOpen = leagueStartDate ? new Date(leagueStartDate) > new Date() : true;
    
    // Set the amount based on registration period
    setFinalAmount(isRegistrationOpen ? registrationFee : amount);
  }, [leagueStartDate, registrationFee, amount]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  const handlePayment = async () => {
    try {
      console.log('Starting payment process...', paymentType);
      setProcessing(true);
      setErrorMessage(null);

      if (paymentType === PaymentType.CREDIT_CARD) {
        if (!card) {
          console.error('Card not initialized');
          throw new Error('Payment form not initialized');
        }

        if (!zipCode || zipCode.length !== 5) {
          console.error('Invalid ZIP code:', zipCode);
          throw new Error('Please enter a valid ZIP code');
        }

        console.log('Tokenizing card...');
        const result = await card.tokenize();
        console.log('Tokenization result:', result);

        if (result.status === 'OK') {
          console.log('Card tokenized successfully:', result.token);
          const payment = await paymentService.processPayment(result.token, finalAmount, zipCode, PaymentType.CREDIT_CARD);
          console.log('Payment processed successfully:', payment);
          onSuccess(payment);
        } else {
          console.error('Tokenization failed:', result);
          throw new Error('Card tokenization failed');
        }
      } else if (paymentType === PaymentType.CASH_APP) {
        const cashAppPayment = await payments.cashAppPay({
          redirectURL: window.location.origin + '/payment-complete',
          referenceId: `payment_${Date.now()}`,
          amount: finalAmount,
          currency: 'USD',
        });

        if (cashAppPayment.status === 'OK') {
          const payment = await paymentService.processPayment(
            cashAppPayment.token,
            finalAmount,
            zipCode,
            PaymentType.CASH_APP
          );
          onSuccess(payment);
        } else {
          throw new Error('Cash App payment failed');
        }
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed');
      onError(error as Error);
    } finally {
      setProcessing(false);
    }
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setZipCode(value);
  };

  if (loading) {
    return <div className="text-white">Loading payment form...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-400 hover:text-white mb-8"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      <div className="bg-[#1a1f2e] rounded-lg p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Complete Your Payment</h1>
        <p className="text-gray-400 mb-8">Secure payment for {description}</p>

        {/* Payment Method Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Select Payment Method</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setPaymentType(PaymentType.CREDIT_CARD)}
              className={`px-4 py-2 rounded-lg ${
                paymentType === PaymentType.CREDIT_CARD
                  ? 'bg-green-600 text-white'
                  : 'bg-[#252b3d] text-gray-400'
              }`}
            >
              Credit Card
            </button>
            <button
              onClick={() => setPaymentType(PaymentType.CASH_APP)}
              className={`px-4 py-2 rounded-lg ${
                paymentType === PaymentType.CASH_APP
                  ? 'bg-green-600 text-white'
                  : 'bg-[#252b3d] text-gray-400'
              }`}
            >
              Cash App
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Payment Summary */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Payment Summary</h2>
            <div className="bg-[#252b3d] rounded-lg p-4 mb-4">
              <div className="mb-4">
                <p className="text-gray-400 mb-1">Item</p>
                <p className="text-white">{description}</p>
              </div>
              <div className="mb-4">
                <p className="text-gray-400 mb-1">Description</p>
                <p className="text-white">
                  Registration fee for {description}
                  {leagueStartDate && (
                    <span className="text-gray-400 text-sm block">
                      League starts: {new Date(leagueStartDate).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-400">Total:</p>
                <p className="text-white text-xl font-bold">${finalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-[#1c3a2b] rounded-lg p-4">
              <div className="flex items-center text-green-500">
                <Lock className="w-4 h-4 mr-2" />
                <p className="text-sm">
                  Your payment information is encrypted and secure. We never store your full card details.
                </p>
              </div>
            </div>
          </div>

          {/* Credit Card Details */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Payment Details</h2>
            <div className="space-y-4">
              {paymentType === PaymentType.CREDIT_CARD ? (
                <>
                  <div>
                    <label className="block text-gray-400 mb-2">Card Number</label>
                    <div 
                      id="card-container"
                      className="bg-[#252b3d] rounded-lg p-4 min-h-[40px]"
                    />
                  </div>

                  <div>
                    <label htmlFor="zipCode" className="block text-gray-400 mb-2">
                      ZIP Code
                    </label>
                    <input
                      id="zipCode"
                      type="text"
                      value={zipCode}
                      onChange={handleZipCodeChange}
                      placeholder="Enter ZIP code"
                      className="w-full bg-[#252b3d] text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      maxLength={5}
                    />
                  </div>
                </>
              ) : (
                <div className="bg-[#252b3d] rounded-lg p-4">
                  <p className="text-white">
                    Click the button below to pay with Cash App. You'll be redirected to complete the payment.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={processing || (paymentType === PaymentType.CREDIT_CARD && zipCode.length !== 5)}
                className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium mt-4"
              >
                {processing ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⚪</span>
                    Processing...
                  </span>
                ) : (
                  `Pay with ${paymentType === PaymentType.CREDIT_CARD ? 'Card' : 'Cash App'} - $${finalAmount.toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 