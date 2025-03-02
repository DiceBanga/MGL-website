import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, DollarSign, CheckCircle, AlertCircle, ArrowLeft, Shield, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface PaymentDetails {
  id: string;
  type: 'tournament' | 'league';
  name: string;
  amount: number;
  description: string;
  teamId?: string;
  eventId?: string;
  playersIds?: string[];
}

const Payments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'square' | 'cashapp' | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardName, setCardName] = useState('');
  const [cashAppUsername, setCashAppUsername] = useState('');

  useEffect(() => {
    // Get payment details from location state or redirect back
    if (location.state?.paymentDetails) {
      setPaymentDetails(location.state.paymentDetails);
    } else {
      navigate('/dashboard');
    }
  }, [location, navigate]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 16) {
      // Format with spaces every 4 digits
      setCardNumber(value.replace(/(\d{4})(?=\d)/g, '$1 ').trim());
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      // Format as MM/YY
      if (value.length > 2) {
        setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
      } else {
        setCardExpiry(value);
      }
    }
  };

  const handleCVCChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setCardCVC(value);
    }
  };

  const validateCardDetails = () => {
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Please enter a valid 16-digit card number');
      return false;
    }
    
    if (cardExpiry.length !== 5) {
      setError('Please enter a valid expiry date (MM/YY)');
      return false;
    }
    
    const [month, year] = cardExpiry.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    if (parseInt(month) < 1 || parseInt(month) > 12) {
      setError('Please enter a valid month (01-12)');
      return false;
    }
    
    if (parseInt(year) < currentYear || 
        (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      setError('Your card has expired');
      return false;
    }
    
    if (cardCVC.length < 3) {
      setError('Please enter a valid security code');
      return false;
    }
    
    if (!cardName.trim()) {
      setError('Please enter the name on your card');
      return false;
    }
    
    return true;
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

  const processSquarePayment = async () => {
    if (!validateCardDetails()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, you would use Square's SDK to tokenize card details
      // and send the token to your backend for processing
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Record payment in database
      if (paymentDetails) {
        await recordPayment('square');
      }
      
      setSuccess(true);
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
        await recordPayment('cashapp');
      }
      
      setSuccess(true);
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const recordPayment = async (provider: string) => {
    if (!user || !paymentDetails) return;
    
    // Record the payment in the database
    const { error } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: paymentDetails.amount,
        currency: 'USD',
        payment_method: provider,
        status: 'completed',
        description: paymentDetails.description,
        metadata: {
          type: paymentDetails.type,
          event_id: paymentDetails.eventId,
          team_id: paymentDetails.teamId,
          players_ids: paymentDetails.playersIds
        }
      });
      
    if (error) {
      console.error('Error recording payment:', error);
      throw new Error('Failed to record payment');
    }
    
    // If this is a tournament or league registration, update the registration status
    if (paymentDetails.type === 'tournament' && paymentDetails.eventId && paymentDetails.teamId) {
      await supabase
        .from('tournament_registrations')
        .update({ status: 'approved', payment_status: 'paid' })
        .eq('tournament_id', paymentDetails.eventId)
        .eq('team_id', paymentDetails.teamId);
    } else if (paymentDetails.type === 'league' && paymentDetails.eventId && paymentDetails.teamId) {
      await supabase
        .from('league_registrations')
        .update({ status: 'approved', payment_status: 'paid' })
        .eq('league_id', paymentDetails.eventId)
        .eq('team_id', paymentDetails.teamId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === 'square') {
      processSquarePayment();
    } else if (paymentMethod === 'cashapp') {
      processCashAppPayment();
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
                <span className="text-white font-medium">{paymentDetails.id.slice(0, 8)}</span>
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
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-300 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">Complete Your Payment</h2>
            <p className="text-gray-300 mt-1">
              Secure payment for {paymentDetails.name}
            </p>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Payment Summary */}
              <div className="md:w-1/3">
                <h3 className="text-lg font-semibold text-white mb-4">Payment Summary</h3>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="mb-4">
                    <p className="text-gray-300 text-sm">Item</p>
                    <p className="text-white font-medium">{paymentDetails.name}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-300 text-sm">Description</p>
                    <p className="text-white">{paymentDetails.description}</p>
                  </div>
                  <div className="border-t border-gray-600 my-4"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total:</span>
                    <span className="text-xl font-bold text-white">${paymentDetails.amount.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="mt-6 bg-green-900/20 border border-green-800/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-gray-300">
                      Your payment information is encrypted and secure. We never store your full card details.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Payment Method Selection */}
              <div className="md:w-2/3">
                {!paymentMethod ? (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Select Payment Method</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setPaymentMethod('square')}
                        className="bg-gray-700 hover:bg-gray-600 rounded-lg p-6 text-left transition-colors"
                      >
                        <div className="flex items-center mb-4">
                          <div className="bg-blue-500/10 p-3 rounded-full mr-4">
                            <CreditCard className="h-6 w-6 text-blue-500" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">Credit Card</h4>
                            <p className="text-gray-400 text-sm">Visa, Mastercard, Amex</p>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Secure payment via Square
                        </p>
                      </button>
                      
                      <button
                        onClick={() => setPaymentMethod('cashapp')}
                        className="bg-gray-700 hover:bg-gray-600 rounded-lg p-6 text-left transition-colors"
                      >
                        <div className="flex items-center mb-4">
                          <div className="bg-green-500/10 p-3 rounded-full mr-4">
                            <DollarSign className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">Cash App</h4>
                            <p className="text-gray-400 text-sm">Pay with your Cash App account</p>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Fast and convenient mobile payment
                        </p>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      {paymentMethod === 'square' ? 'Credit Card Details' : 'Cash App Payment'}
                    </h3>
                    
                    {error && (
                      <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 mb-6 flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-sm text-red-300">{error}</p>
                      </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                      {paymentMethod === 'square' ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Card Number
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={cardNumber}
                                onChange={handleCardNumberChange}
                                placeholder="1234 5678 9012 3456"
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500"
                                required
                              />
                              <div className="absolute right-3 top-2.5">
                                <Lock className="w-5 h-5 text-gray-500" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Expiry Date
                              </label>
                              <input
                                type="text"
                                value={cardExpiry}
                                onChange={handleExpiryChange}
                                placeholder="MM/YY"
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Security Code
                              </label>
                              <input
                                type="text"
                                value={cardCVC}
                                onChange={handleCVCChange}
                                placeholder="CVC"
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500"
                                required
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Name on Card
                            </label>
                            <input
                              type="text"
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="John Doe"
                              className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Cash App Username
                            </label>
                            <input
                              type="text"
                              value={cashAppUsername}
                              onChange={(e) => setCashAppUsername(e.target.value)}
                              placeholder="$username"
                              className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500"
                              required
                            />
                          </div>
                          
                          <div className="bg-gray-700/50 rounded-lg p-4">
                            <p className="text-gray-300 text-sm mb-2">
                              After clicking "Pay with Cash App", you'll be prompted to confirm the payment in your Cash App.
                            </p>
                            <p className="text-gray-300 text-sm">
                              Send payment to: <span className="text-green-500 font-medium">$MilitiaGamingLeague</span>
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-6">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              {paymentMethod === 'square' ? 'Pay with Card' : 'Pay with Cash App'} - ${paymentDetails.amount.toFixed(2)}
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;