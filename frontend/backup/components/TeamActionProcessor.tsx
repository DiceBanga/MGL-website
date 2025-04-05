import { useState } from 'react';
import { RequestService } from '../services/RequestService';
import RenamingForm from './team-actions/RenamingForm';
import LeagueRegistrationForm from './team-actions/LeagueRegistrationForm';
import TournamentRegistrationForm from './team-actions/TournamentRegistrationForm';
import RosterChangeForm from './team-actions/RosterChangeForm';
import OnlineIdChangeForm from './team-actions/OnlineIdChangeForm';
import TeamTransferForm from './team-actions/TeamTransferForm';
import ConfirmationDialog from './ConfirmationDialog';
import { createPaymentDetails } from '../utils/paymentUtils';
import { v4 as uuidv4 } from 'uuid';

// Type definitions
interface TeamActionProcessorProps {
  team: any;
  user: any;
  members: any[];
  itemPrices: {
    TEAM_REBRAND: number;
    LEAGUE_REGISTRATION: number;
    TOURNAMENT_REGISTRATION: number;
    ROSTER_CHANGE: number;
    ONLINE_ID_CHANGE: number;
    TEAM_TRANSFER: number;
  };
  itemIds: {
    TEAM_REBRAND: string;
    LEAGUE_REGISTRATION: string;
    TOURNAMENT_REGISTRATION: string;
    ROSTER_CHANGE: string;
    ONLINE_ID_CHANGE: string;
    TEAM_TRANSFER: string;
  };
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

function TeamActionProcessor({
  team,
  user,
  members,
  itemPrices,
  itemIds,
  onSuccess,
  onError
}: TeamActionProcessorProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [actionData, setActionData] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [processing, setProcessing] = useState(false);
  const requestService = new RequestService();

  const handleActionSelect = (action: string) => {
    setSelectedAction(action);
    setActionData(null);
  };

  const handleActionSubmit = (data: any) => {
    setActionData(data);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!actionData || !selectedAction) return;
    
    setProcessing(true);
    
    try {
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Prepare request data based on action type
      const requestData = {
        request_id: requestId,
        request_type: selectedAction,
        team_id: team.id,
        user_id: user.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        action_data: actionData,
        payment_data: createPaymentDetails({
          amount: getActionPrice(),
          description: getActionDescription(),
          itemId: getActionItemId(),
          metadata: {
            team_id: team.id,
            request_id: requestId,
            request_type: selectedAction,
            ...actionData
          }
        })
      };
      
      // Process the request and handle payment
      const result = await requestService.initiateRequest(requestData);
      
      if (result.success) {
        // Handle successful request initiation
        // The actual execution will happen after payment
        onSuccess(result);
        resetForm();
      } else {
        onError(result.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      onError('An unexpected error occurred');
    } finally {
      setProcessing(false);
      setShowConfirmation(false);
    }
  };
  
  const handleCancel = () => {
    setShowConfirmation(false);
  };
  
  const resetForm = () => {
    setSelectedAction(null);
    setActionData(null);
    setShowConfirmation(false);
  };
  
  const getActionPrice = () => {
    switch (selectedAction) {
      case 'TEAM_REBRAND':
        return itemPrices.TEAM_REBRAND;
      case 'LEAGUE_REGISTRATION':
        return itemPrices.LEAGUE_REGISTRATION;
      case 'TOURNAMENT_REGISTRATION':
        return itemPrices.TOURNAMENT_REGISTRATION;
      case 'ROSTER_CHANGE':
        return itemPrices.ROSTER_CHANGE;
      case 'ONLINE_ID_CHANGE':
        return itemPrices.ONLINE_ID_CHANGE;
      case 'TEAM_TRANSFER':
        return itemPrices.TEAM_TRANSFER;
      default:
        return 0;
    }
  };
  
  const getActionItemId = () => {
    switch (selectedAction) {
      case 'TEAM_REBRAND':
        return itemIds.TEAM_REBRAND;
      case 'LEAGUE_REGISTRATION':
        return itemIds.LEAGUE_REGISTRATION;
      case 'TOURNAMENT_REGISTRATION':
        return itemIds.TOURNAMENT_REGISTRATION;
      case 'ROSTER_CHANGE':
        return itemIds.ROSTER_CHANGE;
      case 'ONLINE_ID_CHANGE':
        return itemIds.ONLINE_ID_CHANGE;
      case 'TEAM_TRANSFER':
        return itemIds.TEAM_TRANSFER;
      default:
        return '';
    }
  };
  
  const getActionDescription = () => {
    switch (selectedAction) {
      case 'TEAM_REBRAND':
        return `Team rebrand for ${team.name}`;
      case 'LEAGUE_REGISTRATION':
        return `League registration for ${team.name}`;
      case 'TOURNAMENT_REGISTRATION':
        return `Tournament registration for ${team.name}`;
      case 'ROSTER_CHANGE':
        return `Roster change for ${team.name}`;
      case 'ONLINE_ID_CHANGE':
        return `Online ID change for ${team.name}`;
      case 'TEAM_TRANSFER':
        return `Team transfer for ${team.name}`;
      default:
        return '';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Action selection buttons */}
      {!selectedAction && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleActionSelect('TEAM_REBRAND')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded"
          >
            Team Rebrand (${itemPrices.TEAM_REBRAND})
          </button>
          <button
            onClick={() => handleActionSelect('LEAGUE_REGISTRATION')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded"
          >
            League Registration (${itemPrices.LEAGUE_REGISTRATION})
          </button>
          <button
            onClick={() => handleActionSelect('TOURNAMENT_REGISTRATION')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded"
          >
            Tournament Registration (${itemPrices.TOURNAMENT_REGISTRATION})
          </button>
          <button
            onClick={() => handleActionSelect('ROSTER_CHANGE')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded"
          >
            Roster Change (${itemPrices.ROSTER_CHANGE})
          </button>
          <button
            onClick={() => handleActionSelect('ONLINE_ID_CHANGE')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded"
          >
            Online ID Change (${itemPrices.ONLINE_ID_CHANGE})
          </button>
          <button
            onClick={() => handleActionSelect('TEAM_TRANSFER')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded"
          >
            Transfer Team (${itemPrices.TEAM_TRANSFER})
          </button>
        </div>
      )}

      {/* Action form based on selection */}
      {selectedAction === 'TEAM_REBRAND' && (
        <RenamingForm 
          team={team} 
          onSubmit={handleActionSubmit}
          onCancel={resetForm}
        />
      )}
      {selectedAction === 'LEAGUE_REGISTRATION' && (
        <LeagueRegistrationForm 
          team={team} 
          members={members}
          onSubmit={handleActionSubmit}
          onCancel={resetForm}
        />
      )}
      {selectedAction === 'TOURNAMENT_REGISTRATION' && (
        <TournamentRegistrationForm 
          team={team} 
          members={members}
          onSubmit={handleActionSubmit}
          onCancel={resetForm}
        />
      )}
      {selectedAction === 'ROSTER_CHANGE' && (
        <RosterChangeForm 
          team={team}
          members={members} 
          onSubmit={handleActionSubmit}
          onCancel={resetForm}
        />
      )}
      {selectedAction === 'ONLINE_ID_CHANGE' && (
        <OnlineIdChangeForm 
          team={team} 
          onSubmit={handleActionSubmit}
          onCancel={resetForm}
        />
      )}
      {selectedAction === 'TEAM_TRANSFER' && (
        <TeamTransferForm 
          team={team} 
          onSubmit={handleActionSubmit}
          onCancel={resetForm}
        />
      )}

      {/* Confirmation dialog */}
      {showConfirmation && (
        <ConfirmationDialog
          title={`Confirm ${getActionDescription()}`}
          message={`This action will cost $${getActionPrice()}. Do you want to proceed?`}
          confirmLabel="Proceed to Payment"
          cancelLabel="Cancel"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isLoading={processing}
        />
      )}
    </div>
  );
}

export default TeamActionProcessor; 