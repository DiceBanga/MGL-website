import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { PaymentService } from '../../services/PaymentService';
import { supabase } from '../../lib/supabase';

const PaymentPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  
  // Get request type and amount from URL params
  const requestType = searchParams.get('type');
  const amount = searchParams.get('amount');
  
  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!requestId) {
        setError('No request ID provided');
        setLoading(false);
        return;
      }
      
      try {
        // Get request details from the database
        const { data, error } = await supabase
          .from('team_change_requests')
          .select('*')
          .eq('id', requestId)
          .single();
          
        if (error) {
          throw new Error(`Failed to fetch request details: ${error.message}`);
        }
        
        if (!data) {
          throw new Error('Request not found');
        }
        
        setPaymentDetails(data);
      } catch (err) {
        console.error('Error fetching request details:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequestDetails();
  }, [requestId]);
  
  // Handle successful payment
  const handlePaymentSuccess = () => {
    // Redirect to success page or team dashboard
    navigate(`/teams`);
  };
  
  // Handle payment cancellation
  const handlePaymentCancel = () => {
    // Go back to previous page
    navigate(-1);
  };
  
  // For now, this is just a placeholder
  // In a real implementation, you would integrate with Square or another payment provider
  const processPayment = async () => {
    try {
      setLoading(true);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update request status
      const { error } = await supabase
        .from('team_change_requests')
        .update({ status: 'approved', payment_id: 'test-payment-id' })
        .eq('id', requestId);
        
      if (error) {
        throw new Error(`Failed to update request status: ${error.message}`);
      }
      
      // Show success message and redirect
      handlePaymentSuccess();
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-lg text-white">Loading payment details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4 w-full max-w-md">
          <p className="text-red-500">{error}</p>
        </div>
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md mb-8">
        <h1 className="text-2xl font-bold text-white mb-6">Complete Payment</h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-medium text-white mb-2">Payment Details</h2>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-300 mb-2">
              <span className="font-medium text-white">Type:</span> {requestType}
            </p>
            <p className="text-gray-300 mb-2">
              <span className="font-medium text-white">Request ID:</span> {requestId}
            </p>
            <p className="text-gray-300 mb-4">
              <span className="font-medium text-white">Amount:</span> ${amount}
            </p>
            
            {paymentDetails && (
              <>
                <p className="text-gray-300 mb-2">
                  <span className="font-medium text-white">Team:</span> {paymentDetails.team_id}
                </p>
                <p className="text-gray-300">
                  <span className="font-medium text-white">Status:</span> {paymentDetails.status}
                </p>
              </>
            )}
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={processPayment}
            disabled={loading}
            className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                Processing...
              </>
            ) : (
              'Process Payment'
            )}
          </button>
          
          <button
            onClick={handlePaymentCancel}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage; 