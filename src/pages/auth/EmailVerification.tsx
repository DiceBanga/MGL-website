import React from 'react';
import { Link } from 'react-router-dom';

const EmailVerification = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Check your email</h2>
            <p className="text-gray-300 mb-6">
              We've sent a verification link to your email address. Please click the link to verify your account.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              If you don't see the email, check your spam folder.
            </p>
            <Link
              to="/login"
              className="text-green-500 hover:text-green-400 font- medium"
            >
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;