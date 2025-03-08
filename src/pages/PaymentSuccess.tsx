import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { CheckCircle, Receipt, ArrowLeft } from 'lucide-react';

export function PaymentSuccess() {
  const location = useLocation();
  const { paymentId, receiptUrl } = location.state || {};

  if (!paymentId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-green-500/10 p-4 rounded-full">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Payment Successful!
          </h2>
          
          <p className="text-gray-300 text-center mb-8">
            Your payment has been processed successfully.
          </p>

          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Payment ID:</span>
              <span className="text-white font-medium">{paymentId.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Date:</span>
              <span className="text-white font-medium">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center px-4 py-2 border border-green-500 text-green-500 rounded-lg hover:bg-green-500/10"
              >
                <Receipt className="w-5 h-5 mr-2" />
                View Receipt
              </a>
            )}
            
            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}