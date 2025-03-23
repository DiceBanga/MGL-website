import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import TeamActionProcessor from './TeamActionProcessor';

interface TeamCreationFormProps {
  onSuccess?: (response: any) => void;
  onCancel?: () => void;
  requiresPayment?: boolean;
  paymentAmount?: number;
}

const TeamCreationForm: React.FC<TeamCreationFormProps> = ({
  onSuccess,
  onCancel,
  requiresPayment = true,
  paymentAmount = 50.00 // Default team creation fee
}) => {
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  
  if (!user) {
    return (
      <div className="alert alert-error">
        <p>You must be logged in to create a team.</p>
      </div>
    );
  }
  
  const handleSuccess = (response: any) => {
    setError(null);
    if (onSuccess) {
      onSuccess(response);
    }
  };
  
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Create a New Team</h1>
      
      {error && (
        <div className="alert alert-error mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <TeamActionProcessor
        actionType="team_creation"
        userId={user.id}
        onSuccess={handleSuccess}
        onCancel={onCancel}
        onError={handleError}
        requiresPayment={requiresPayment}
        paymentAmount={paymentAmount}
      />
      
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Important Information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>You will be automatically assigned as the team captain.</li>
          <li>Team names must be appropriate and follow our community guidelines.</li>
          <li>Once created, you can invite players to join your team.</li>
          {requiresPayment && (
            <li>Team creation requires a one-time fee of ${paymentAmount.toFixed(2)}.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default TeamCreationForm; 