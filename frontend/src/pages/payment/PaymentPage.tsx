import React, { useState, useEffect, useMemo } from 'react'; // Add useMemo
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'; // Add useLocation
import { PaymentService } from '../../services/PaymentService';
import { RequestService } from '../../services/RequestService'; // Import RequestService (named)
import { supabase } from '../../lib/supabase';
import { SquarePaymentForm } from '../../components/SquarePaymentForm'; // Use named import

const PaymentPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation(); // Get location object

  // Instantiate services
  const paymentService = useMemo(() => new PaymentService(), []);
  const requestService = useMemo(() => new RequestService(), []);

  // Get data passed via navigation state
  const {
    paymentDetails: navPaymentDetails,
    changeRequestType,
    changeRequestOptions
  } = location.state || {};

  const [loading, setLoading] = useState(false); // Start not loading initially
  const [error, setError] = useState<string | null>(null);
  // State to hold payment details (might combine nav state and fetched state if needed)
  const [displayDetails, setDisplayDetails] = useState<any>(navPaymentDetails || null);
  
  // Get details from navigation state primarily
  const paymentAmount = navPaymentDetails?.amount;
  const paymentDescription = navPaymentDetails?.description || `Payment for ${changeRequestType}`;
  const requestIdFromState = navPaymentDetails?.request_id || changeRequestOptions?.requestId; // Get request ID from state

  // Keep URL params for potential fallback or direct linking? (Decide based on requirements)
  // const requestIdFromUrl = useParams<{ requestId: string }>().requestId;
  // const requestTypeFromUrl = searchParams.get('type');
  // const amountFromUrl = searchParams.get('amount');
  
  // Remove or adapt useEffect fetching from DB based on requestId from URL.
  // We primarily rely on the data passed via navigation state now.
  // If we need to display *existing* request status, we might still fetch,
  // but the core payment/request creation logic uses the nav state.
  useEffect(() => {
    // If needed, fetch existing request status using requestIdFromState
    // For now, we assume the nav state is sufficient to proceed.
    if (!navPaymentDetails || !changeRequestType || !changeRequestOptions) {
        setError("Required payment or request details were not provided.");
        console.error("Missing location state:", location.state);
    } else {
        setDisplayDetails(navPaymentDetails); // Use details from navigation
    }
  }, [navPaymentDetails, changeRequestType, changeRequestOptions, location.state]);
  
  // Handle successful payment
  console.debug("[PaymentPage] paymentDetails before sending to backend:", displayDetails);

  const handlePaymentSuccess = () => {
    // Redirect to success page or team dashboard
    navigate(`/teams`);
  };
  
  // Handle payment cancellation
  const handlePaymentCancel = () => {
    // Go back to previous page
    navigate(-1);
  };
  
  // This function is called by SquarePaymentForm on successful payment processing
  const handlePaymentSuccessAndCreateRequest = async (paymentResult: any) => {
     // Ensure we have the necessary details from navigation state
    if (!navPaymentDetails || !changeRequestType || !changeRequestOptions || !requestIdFromState) {
      setError("Cannot create request: Missing required details passed via navigation.");
      console.error("Missing state for request creation:", { navPaymentDetails, changeRequestType, changeRequestOptions });
      // Navigate back or show persistent error?
      navigate(-1); // Go back if state is missing
      return;
    }

    setLoading(true); // Indicate request creation processing
    setError(null);

    try {
      // Extract the actual payment transaction ID from the result provided by SquarePaymentForm/SquarePaymentService
      // Adjust 'paymentId' based on the actual structure of paymentResult
      const paymentReference = paymentResult?.paymentId || paymentResult?.id || `sq_${Date.now()}`;
      console.log("Payment successful, paymentReference:", paymentReference);

      // Create the Team Change Request via RequestService
      console.log("Creating team change request via RequestService...");
      await requestService.createTeamChangeRequest({
        requestType: changeRequestType,
        teamId: navPaymentDetails.teamId,
        requestedBy: navPaymentDetails.captainId, // Assuming captainId is the user ID from paymentDetails
        itemId: navPaymentDetails.item_id,
        paymentReference: paymentReference, // Pass the actual transaction ID
        requestId: requestIdFromState, // Pass the pre-generated request ID
        tournamentId: changeRequestOptions.tournamentId,
        leagueId: changeRequestOptions.leagueId,
        metadata: changeRequestOptions.metadata // Pass the specific metadata for the request record
      });

      console.log("Team change request created with status 'processing'.");

      // Handle success (e.g., navigate to dashboard or success page)
      // TODO: Consider navigating to a dedicated success page that shows receipt info
      navigate('/dashboard', { replace: true, state: { successMessage: `${changeRequestType} request submitted successfully!` } });

    } catch (err: any) {
      console.error('Error during request creation after successful payment:', err);
      // If request creation fails after payment, this is a critical state.
      // Log detailed error, potentially inform user to contact support.
      setError(`Payment succeeded, but failed to create the request: ${err.message}. Please contact support.`);
      // Don't navigate away, show the error.
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  // This function is called by SquarePaymentForm on payment failure
  const handlePaymentError = (error: Error) => {
      console.error('Payment processing error reported by form:', error);
      setError(`Payment failed: ${error.message}`);
      setLoading(false); // Ensure loading stops
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
              <span className="font-medium text-white">Type:</span> {changeRequestType || 'N/A'} {/* Use state variable */}
            </p>
            <p className="text-gray-300 mb-2">
              <span className="font-medium text-white">Request ID:</span> {requestIdFromState || 'N/A'} {/* Use state variable */}
            </p>
            <p className="text-gray-300 mb-4">
              <span className="font-medium text-white">Amount:</span> ${paymentAmount?.toFixed(2) || '0.00'} {/* Use state variable */}
            </p>
            
            {/* Display details from the passed paymentDetails object */}
            {displayDetails && (
              <>
                {displayDetails.teamId && (
                   <p className="text-gray-300 mb-2">
                     <span className="font-medium text-white">Team ID:</span> {displayDetails.teamId}
                   </p>
                )}
                 {displayDetails.description && (
                   <p className="text-gray-300 mb-2">
                     <span className="font-medium text-white">Description:</span> {displayDetails.description}
                   </p>
                 )}
                 {/* Add other relevant details from displayDetails if needed */}
              </>
            )}
          </div>
        </div>
        
        {/* Render Square Payment Form */}
        <div className="mt-6 border-t border-gray-700 pt-6">
          <h2 className="text-lg font-medium text-white mb-4">Enter Payment Details</h2>
          {/* Pass paymentDetails from nav state and the success/error handlers */}
          {displayDetails ? (
            <SquarePaymentForm
              paymentDetails={displayDetails} // Pass the full details object
              onSuccess={handlePaymentSuccessAndCreateRequest} // Call this on successful payment
              onError={handlePaymentError} // Call this on payment error
            />
          ) : (
             <p className="text-red-500">Cannot load payment form: Payment details are missing.</p>
          )}

          {/* Keep Cancel button - Note: Form might have its own cancel/back logic */}
           <button
            onClick={handlePaymentCancel}
            disabled={loading} // Disable if overall page is loading
            className="w-full mt-4 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-white transition-colors"
          >
            Cancel Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage; 