import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, DollarSign, CheckCircle, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { PaymentDetails } from '../types/payment';
import { PaymentForm, CreditCard as SquareCard } from 'react-square-web-payments-sdk';
import { SquarePaymentService } from '../services/SquarePaymentService';
import { DbPayment } from '../types/database';

const squarePaymentService = new SquarePaymentService();

const Payments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'square' | 'cashapp' | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardName, setCardName] = useState('');
  const [cashAppUsername, setCashAppUsername] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isProcessing, setProcessing] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<DbPayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Get payment details from location state or redirect back
    if (location.state?.paymentDetails) {
      setPaymentDetails(location.state.paymentDetails);
    } else {
      navigate('/dashboard');
    }
  }, [location, navigate]);

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    if (!user) return;
    
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPaymentHistory(data as DbPayment[]);
    } catch (err) {
      console.error('Error fetching payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const recordPaymentInDatabase = async (provider: string, paymentResult?: any) => {
    if (!user || !paymentDetails) return false;
    
    try {
      const paymentData: Partial<DbPayment> = {
        user_id: user.id,
        amount: paymentDetails.amount,
        currency: 'USD',
        payment_method: provider,
        status: paymentResult?.success ? 'completed' : 'pending',
        description: paymentDetails.description || null,
        metadata: paymentDetails,
        payment_details: paymentResult || null,
        payment_id: paymentResult?.paymentId || null,
        reference_id: paymentDetails.referenceId || null
      };

      const { data, error } = await supabase
        .from('payments')
        .insert(paymentData);

      if (error) throw error;
      
      // Refresh payment history after recording a new payment
      fetchPaymentHistory();
      
      return true;
    } catch (err) {
      console.error('Error recording payment:', err);
      return false;
    }
  };

  const handleSquarePayment = async (token: string) => {
    try {
      setProcessing(true);
      setError(null);

      if (!paymentDetails) {
        throw new Error('No payment details provided');
      }

      if (!cardName.trim()) {
        throw new Error('Please enter the name on your card');
      }

      // Create payment with Square
      const result = await squarePaymentService.createPayment(token, paymentDetails);

      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      // Record the payment first
      await recordPaymentInDatabase('square', result);

      // Then update UI with success
      setSuccess(true);
      setPaymentId(result.paymentId ?? '');
      setReceiptUrl(result.receiptUrl ?? '');

    } catch (err) {
      console.error('Payment processing error:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const validateCashApp = () => {
    if (!cashAppUsername.trim()) {
      setError('Please enter your Cash App username');
      return false;
    }
    
    if (!cashAppUsername.startsWith('$')) {
      setError('Cash App username should start with $');
      return false;
    }
    
    return true;
  };

  const processCashAppPayment = async () => {
    if (!validateCashApp()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, you would redirect to Cash App or generate a QR code
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Record payment in database
      if (paymentDetails) {
        await recordPaymentInDatabase('cashapp');
      }
      
      setSuccess(true);
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === 'cashapp') {
      await processCashAppPayment();
    }
  };

  const handleBack = () => {
    if (success) {
      navigate('/dashboard');
    } else if (paymentMethod) {
      setPaymentMethod(null);
      setError(null);
    } else {
      navigate(-1);
    }
  };

  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading payment details...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 py-12">
        <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-green-500/10 p-4 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-4">Payment Successful!</h2>
            <p className="text-gray-300 text-center mb-8">
              Your payment of ${paymentDetails.amount.toFixed(2)} for {paymentDetails.name} has been processed successfully.
            </p>
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-300">Payment ID:</span>
                <span className="text-white font-medium">{paymentId}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-300">Date:</span>
                <span className="text-white font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Method:</span>
                <span className="text-white font-medium">
                  {paymentMethod === 'square' ? 'Credit Card' : 'Cash App'}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={handleBack}
          className="flex items-center text-green-500 hover:text-green-400 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        
        {success ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-gray-300 mb-6">
              Thank you for your payment. Your transaction has been completed.
            </p>
            {paymentId && (
              <p className="text-gray-400 mb-2">Payment ID: {paymentId}</p>
            )}
            {receiptUrl && (
              <a 
                href={receiptUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-400"
              >
                View Receipt
              </a>
            )}
            <div className="mt-8">
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white mb-6">
              {paymentDetails?.name || 'Payment'}
            </h1>
            
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Payment Summary</h2>
              <div className="flex justify-between py-3 border-b border-gray-700">
                <span className="text-gray-300">Description</span>
                <span className="text-white">{paymentDetails?.description || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-700">
                <span className="text-gray-300">Amount</span>
                <span className="text-white font-semibold">
                  ${paymentDetails?.amount.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
            
            {/* Payment method selection */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Select Payment Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod('square')}
                  className={`flex items-center p-4 rounded-lg border ${
                    paymentMethod === 'square' 
                      ? 'border-green-500 bg-gray-700' 
                      : 'border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <CreditCard className="w-6 h-6 text-gray-400 mr-3" />
                  <div className="text-left">
                    <div className="text-white font-medium">Credit Card</div>
                    <div className="text-gray-400 text-sm">Pay with Visa, Mastercard, etc.</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setPaymentMethod('cashapp')}
                  className={`flex items-center p-4 rounded-lg border ${
                    paymentMethod === 'cashapp' 
                      ? 'border-green-500 bg-gray-700' 
                      : 'border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <DollarSign className="w-6 h-6 text-gray-400 mr-3" />
                  <div className="text-left">
                    <div className="text-white font-medium">Cash App</div>
                    <div className="text-gray-400 text-sm">Pay with Cash App</div>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Payment form based on selected method */}
            {paymentMethod && (
              <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {paymentMethod === 'square' ? 'Credit Card Details' : 'Cash App Details'}
                </h2>
                
                {error && (
                  <div className="bg-red-900/30 border border-red-800 rounded-md p-4 mb-6 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-red-200">{error}</p>
                  </div>
                )}
                
                {paymentMethod === 'square' ? (
                  <div>
                    <div className="mb-6">
                      <label htmlFor="cardName" className="block text-gray-300 mb-2">Name on Card</label>
                      <input
                        id="cardName"
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white"
                        placeholder="John Doe"
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="mb-6">
                      <PaymentForm
                        applicationId={import.meta.env.VITE_SQUARE_APP_ID}
                        locationId={import.meta.env.VITE_SQUARE_LOCATION_ID}
                        cardTokenizeResponseReceived={async (token) => {
                          if (token.token) {
                            await handleSquarePayment(token.token);
                          } else {
                            setError('Failed to process payment: Invalid token');
                          }
                        }}
                        createVerificationDetails={() => ({
                          amount: String((paymentDetails?.amount || 0).toFixed(2)),
                          currencyCode: 'USD',
                          intent: 'CHARGE',
                          billingContact: {
                            familyName: cardName
                          }
                        })}
                      >
                        <SquareCard />
                      </PaymentForm>
                    </div>
                    <div className="flex items-center text-gray-400 text-sm mb-4">
                      <Shield className="w-4 h-4 mr-2" />
                      Your payment information is secure and encrypted
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                      <label htmlFor="cashAppUsername" className="block text-gray-300 mb-2">Cash App Username</label>
                      <input
                        id="cashAppUsername"
                        type="text"
                        value={cashAppUsername}
                        onChange={(e) => setCashAppUsername(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white"
                        placeholder="$username"
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : `Pay $${paymentDetails?.amount.toFixed(2) || '0.00'}`}
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Payment History Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Payment History</h2>
          
          {loadingHistory ? (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">Loading payment history...</p>
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-400">No payment history available.</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="py-3 px-4 text-left text-gray-300 font-medium">Date</th>
                    <th className="py-3 px-4 text-left text-gray-300 font-medium">Description</th>
                    <th className="py-3 px-4 text-left text-gray-300 font-medium">Amount</th>
                    <th className="py-3 px-4 text-left text-gray-300 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id} className="border-t border-gray-700">
                      <td className="py-3 px-4 text-gray-300">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {payment.description || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-white">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          payment.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                          payment.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                          payment.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;