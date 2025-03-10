import React from 'react';
import { SquarePaymentForm } from '../components/SquarePaymentForm';

export function PaymentPage() {
  const handlePaymentSuccess = (payment: any) => {
    console.log('Payment successful:', payment);
    // Handle successful payment (e.g., show success message, redirect)
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment failed:', error);
    // Handle payment error (e.g., show error message)
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Complete Payment</h1>
      <SquarePaymentForm
        amount={100} // Regular price
        registrationFee={50} // Early registration fee
        leagueStartDate="2024-04-01" // Replace with actual league start date
        description="Spring 2024 League"
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
} 