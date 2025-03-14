import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const EmailVerificationFailed = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-2xl font-bold text-white">Verification failed</h2>
            <p className="mt-2 text-gray-300">
              The verification link is invalid or has expired. Please try again.
            </p>
            <div className="mt-6 space-y-4">
              <Link
                to="/register"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-700 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Sign up again
              </Link>
              <div>
                <Link
                  to="/contact"
                  className="text-green-500 hover:text-green-400 font-medium"
                >
                  Contact support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationFailed;