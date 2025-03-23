import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, DollarSign, CheckCircle, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { PaymentDetails, PaymentResult } from '../types/payment';
import { PaymentForm, CreditCard as SquareCard } from 'react-square-web-payments-sdk';
import { PaymentService } from '../services/PaymentService';
import { DbPayment } from '../types/database';
import { validatePaymentDetails } from '../utils/paymentUtils';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { v4 as uuidv4 } from 'uuid';

// Create a singleton instance of the payment service
const paymentService = new PaymentService();

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
  
  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // Add onSuccessCallback to the component state
  const [onSuccessCallback, setOnSuccessCallback] = useState<((paymentId: string) => Promise<void>) | null>(null);

  // Add state for change request type
  const [changeRequestType, setChangeRequestType] = useState<string | null>(null);

  useEffect(() => {
    // Get payment details from location state or redirect back
    const state = location.state as { 
      paymentDetails?: PaymentDetails;
      onSuccess?: (paymentId: string) => Promise<void>;
      changeRequestType?: string;
    };
    
    if (state?.paymentDetails) {
      const details = state.paymentDetails;
      
      // Validate payment details
      const validationError = validatePaymentDetails(details);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setPaymentDetails(details);
    } else {
      navigate('/dashboard');
    }
    
    if (state?.onSuccess) {
      setOnSuccessCallback(state.onSuccess);
    }
    
    if (state?.changeRequestType) {
      setChangeRequestType(state.changeRequestType);
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    if (!user) return;
    
    try {
      setLoadingHistory(true);
      const payments = await paymentService.getPaymentHistory(user.id);
      setPaymentHistory(payments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentDetails) {
      setError('Payment details are missing');
      return;
    }
    
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }
    
    if (paymentMethod === 'cashapp') {
      // Show confirmation dialog
      setShowConfirmation(true);
    }
  };
  
  const confirmCashAppPayment = async () => {
    if (!paymentDetails || !user) {
      setError('Payment details are missing');
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      // Handle Cash App payment
      if (!cashAppUsername) {
        throw new Error('Cash App username is required');
      }
      
      // Record the pending payment
      const { data, error } = await supabase
        .from('payments')
        .insert({
          id: paymentDetails.id,
          user_id: user.id,
          amount: paymentDetails.amount,
          currency: 'USD',
          payment_method: 'cashapp',
          status: 'pending',
          description: paymentDetails.description,
          metadata: {
            type: paymentDetails.type,
            teamId: paymentDetails.teamId,
            eventId: paymentDetails.eventId,
            playersIds: paymentDetails.playersIds,
            playerId: paymentDetails.playerId,
            request_id: paymentDetails.request_id,
            cashapp_username: cashAppUsername
          },
          reference_id: paymentDetails.referenceId
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Show success message with instructions
      setSuccess(true);
      setPaymentId(data.id);
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during payment processing');
    } finally {
      setProcessing(false);
      setShowConfirmation(false);
    }
  };

  const handleSquarePayment = async (token: any) => {
    if (!paymentDetails) {
      setError('Payment details are missing');
      return;
    }
    
    // Store the token and show confirmation dialog
    setPendingToken(token.token);
    setShowConfirmation(true);
  };
  
  const createTeamChangeRequest = async (
    paymentId: string,
    changeRequestType: string,
    paymentDetails: PaymentDetails
  ) => {
    if (!paymentDetails.metadata?.changeRequestData) {
      console.error('Change request data is missing');
      return null;
    }
    
    const { 
      teamId, 
      requestedBy, 
      itemId, 
      playerId, 
      oldValue, 
      newValue, 
      metadata 
    } = paymentDetails.metadata.changeRequestData;
    
    try {
      // Always generate a new UUID for the team change request
      const requestId = uuidv4();
      
      console.log('Creating team change request with ID:', requestId);
      console.log('Team ID:', teamId);
      console.log('Player ID:', playerId);
      console.log('Payment ID (reference only):', paymentId);
      
      // Validate UUIDs
      const validateUUID = (id: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      };
      
      if (!validateUUID(teamId)) {
        console.error('Invalid team ID format:', teamId);
        return null;
      }
      
      if (!validateUUID(playerId)) {
        console.error('Invalid player ID format:', playerId);
        return null;
      }
      
      // Validate item_id format (must be a 4-digit number)
      const validateItemId = (id: string) => {
        return /^[0-9]{4}$/.test(id);
      };
      
      // Ensure item_id is properly formatted
      let formattedItemId = itemId;
      if (!validateItemId(itemId)) {
        console.warn('Item ID not in correct format, attempting to fix:', itemId);
        
        // Try to fetch the correct item_id from the database based on the change request type
        try {
          const itemType = changeRequestType === 'team_transfer' ? 'Team Transfer' :
                          changeRequestType === 'team_rebrand' ? 'Team Rebrand' :
                          changeRequestType === 'online_id_change' ? 'Gamer Tag Change' :
                          changeRequestType === 'roster_change' ? 'Roster Change' : null;
                          
          if (itemType) {
            const { data, error } = await supabase
              .from('items')
              .select('item_id')
              .eq('item_name', itemType)
              .single();
              
            if (!error && data) {
              formattedItemId = data.item_id;
              console.log(`Found item_id ${formattedItemId} for ${itemType} from database`);
            }
          }
        } catch (fetchError) {
          console.error('Error fetching item_id from database:', fetchError);
        }
        
        // If we still don't have a valid item_id, try to format the existing one
        if (!validateItemId(formattedItemId)) {
          // Try to convert to a 4-digit number
          if (/^\d+$/.test(itemId)) {
            // If it's numeric, pad with zeros to make it 4 digits
            formattedItemId = itemId.padStart(4, '0');
            if (formattedItemId.length > 4) {
              // If longer than 4 digits, take the last 4
              formattedItemId = formattedItemId.slice(-4);
            }
          } else {
            // Default to a valid item ID based on the change request type
            formattedItemId = 
              changeRequestType === 'team_transfer' ? '1002' :
              changeRequestType === 'team_rebrand' ? '1006' :
              changeRequestType === 'online_id_change' ? '1007' :
              changeRequestType === 'roster_change' ? '1005' : '1000';
            console.warn(`Using default item ID ${formattedItemId} for ${changeRequestType}`);
          }
        }
      }
      
      console.log('Using formatted item ID:', formattedItemId);
      
      // Create a clean metadata object
      const cleanMetadata = {
        ...metadata,
        paymentId: paymentId, // Store payment ID as a reference
        timestamp: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('team_change_requests')
        .insert({
          id: requestId,
          team_id: teamId,
          request_type: changeRequestType,
          requested_by: requestedBy,
          player_id: playerId,
          old_value: oldValue,
          new_value: newValue,
          status: 'pending',
          payment_reference: paymentId, // Use a different field name to avoid UUID validation
          item_id: formattedItemId, // Use the formatted item ID
          metadata: cleanMetadata
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating team change request:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Error creating team change request:', err);
      return null;
    }
  };

  const confirmSquarePayment = async () => {
    if (!paymentDetails || !pendingToken) {
      setError('Payment details or token are missing');
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      // Process the payment using our payment service
      const result = await paymentService.processSquarePayment(pendingToken, paymentDetails);
      
      if (result.success) {
        setSuccess(true);
        setPaymentId(result.paymentId || '');
        setReceiptUrl(result.receiptUrl || '');
        
        // Create a team change request if needed
        if (changeRequestType && result.paymentId && paymentDetails) {
          try {
            const changeRequest = await createTeamChangeRequest(
              result.paymentId,
              changeRequestType,
              paymentDetails
            );
            
            if (changeRequest) {
              console.log('Team change request created:', changeRequest);
            }
          } catch (changeRequestError) {
            console.error('Error creating team change request:', changeRequestError);
          }
        }
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Square payment error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during payment processing');
    } finally {
      setProcessing(false);
      setShowConfirmation(false);
      setPendingToken(null);
    }
  };
  
  const handleConfirmPayment = () => {
    if (paymentMethod === 'square' && pendingToken) {
      confirmSquarePayment();
    } else if (paymentMethod === 'cashapp') {
      confirmCashAppPayment();
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (success) {
    return (
      <div className="bg-gray-900 min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 sm:p-10">
              <div className="flex flex-col items-center text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
                <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
                <p className="text-gray-300 mb-6">
                  {paymentMethod === 'square' 
                    ? 'Your payment has been processed successfully.' 
                    : 'Your payment request has been submitted.'}
                </p>
                
                {paymentMethod === 'square' && (
                  <div className="mb-6 w-full">
                    <div className="bg-gray-700 rounded-lg p-4 mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-300">Payment ID:</span>
                        <span className="text-white font-medium">{paymentId}</span>
                      </div>
                      {receiptUrl && (
                        <div className="mt-4">
                          <a 
                            href={receiptUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-400 flex items-center justify-center"
                          >
                            View Receipt
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {paymentMethod === 'cashapp' && (
                  <div className="mb-6 w-full">
                    <div className="bg-gray-700 rounded-lg p-4 mb-4">
                      <p className="text-gray-300 mb-4">
                        Please send ${paymentDetails?.amount} to <span className="text-white font-medium">$MGL</span> via Cash App.
                      </p>
                      <p className="text-gray-300 mb-4">
                        Include your reference ID in the payment note:
                      </p>
                      <div className="bg-gray-600 p-2 rounded mb-4">
                        <p className="text-white font-mono text-center">{paymentDetails?.referenceId}</p>
                      </div>
                      <p className="text-yellow-500 text-sm">
                        Your registration will be confirmed once we verify your payment.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-4">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={handleGoBack}
          className="flex items-center text-gray-300 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 sm:p-10">
            <h1 className="text-3xl font-bold text-white mb-6">Payment</h1>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}
            
            {paymentDetails && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Payment Details</h2>
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Item:</span>
                    <span className="text-white font-medium">{paymentDetails.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Amount:</span>
                    <span className="text-white font-medium">${paymentDetails.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Description:</span>
                    <span className="text-white font-medium">{paymentDetails.description}</span>
                  </div>
                </div>
                
                <h2 className="text-xl font-semibold text-white mb-4">Select Payment Method</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('square')}
                    className={`flex items-center justify-center p-4 rounded-lg border-2 ${
                      paymentMethod === 'square' 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <CreditCard className="w-6 h-6 mr-3 text-gray-300" />
                    <span className="text-white font-medium">Credit Card</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cashapp')}
                    className={`flex items-center justify-center p-4 rounded-lg border-2 ${
                      paymentMethod === 'cashapp' 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <DollarSign className="w-6 h-6 mr-3 text-gray-300" />
                    <span className="text-white font-medium">Cash App</span>
                  </button>
                </div>
              </div>
            )}
            
            {paymentMethod === 'square' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Card Details</h2>
                <div className="mb-4">
                  <label htmlFor="cardName" className="block text-sm font-medium text-gray-300 mb-1">
                    Name on Card
                  </label>
                  <input
                    id="cardName"
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>
                
                <PaymentForm
                  applicationId={import.meta.env.VITE_SQUARE_APP_ID}
                  locationId={import.meta.env.VITE_SQUARE_LOCATION_ID}
                  cardTokenizeResponseReceived={handleSquarePayment}
                >
                  <div className="mb-6">
                    <SquareCard />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isProcessing || !cardName}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>Pay ${paymentDetails?.amount}</>
                    )}
                  </button>
                </PaymentForm>
                
                <div className="mt-4 flex items-center justify-center text-sm text-gray-400">
                  <Shield className="w-4 h-4 mr-2" />
                  Secure payment processed by Square
                </div>
              </div>
            )}
            
            {paymentMethod === 'cashapp' && (
              <form onSubmit={handleSubmit}>
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-white mb-4">Cash App Details</h2>
                  <div className="mb-4">
                    <label htmlFor="cashAppUsername" className="block text-sm font-medium text-gray-300 mb-1">
                      Your Cash App Username
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-600 bg-gray-700 text-gray-300">
                        $
                      </span>
                      <input
                        id="cashAppUsername"
                        type="text"
                        value={cashAppUsername}
                        onChange={(e) => setCashAppUsername(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 rounded-r-md px-3 py-2 text-white"
                        placeholder="YourCashAppName"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-500 px-4 py-3 rounded mb-6">
                    <p className="text-sm">
                      After submitting, you'll need to manually send ${paymentDetails?.amount} to $MGL via Cash App.
                      Include your reference ID in the payment note.
                    </p>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isProcessing || !cashAppUsername}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>Continue to Payment</>
                    )}
                  </button>
                </div>
              </form>
            )}
            
            {/* Payment History */}
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-white mb-4">Payment History</h2>
              {loadingHistory ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-gray-400">No payment history found</p>
                </div>
              ) : (
                <div className="bg-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-600">
                    <thead className="bg-gray-800">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {payment.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            ${payment.amount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {payment.status}
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
      </div>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        title="Confirm Payment"
        message={`Are you sure you want to proceed with the ${paymentMethod === 'square' ? 'credit card' : 'Cash App'} payment of $${paymentDetails?.amount} for ${paymentDetails?.name}?`}
        confirmText={`Pay $${paymentDetails?.amount}`}
        cancelText="Cancel"
        onConfirm={handleConfirmPayment}
        onCancel={() => {
          setShowConfirmation(false);
          setPendingToken(null);
        }}
        type="warning"
        isLoading={isProcessing}
      />
    </div>
  );
};

export default Payments;