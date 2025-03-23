import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import ConfirmationDialog from './ConfirmationDialog';
import { 
  RequestService, 
  RequestType,
  TeamRebrandRequest, 
  OnlineIdChangeRequest, 
  TeamCreationRequest,
  TeamTransferRequest,
  RosterChangeRequest,
  LeagueRegistrationRequest,
  TournamentRegistrationRequest,
  RequestData
} from '../services/RequestService';

// Props type for the TeamActionProcessor component
interface TeamActionProcessorProps {
  actionType: RequestType;
  teamId?: string;
  userId: string;
  initialValue?: string;
  onSuccess?: (response: any) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
  requiresPayment?: boolean;
  paymentAmount?: number;
  members?: any[]; // Optional members array for roster-related operations
}

// FormData interface to handle different action types
interface FormData {
  team_name?: string;
  online_id?: string;
  platform?: string;
  captain_id?: string;
  old_captain_id?: string;
  team_id?: string;
  new_captain_id?: string;
  roster_changes?: any[];
  player_id?: string;
  operation?: 'add' | 'remove' | 'update';
  new_role?: string;
  league_id?: string;
  season?: number;
  player_ids?: string[];
  tournament_id?: string;
}

const TeamActionProcessor: React.FC<TeamActionProcessorProps> = ({
  actionType,
  teamId,
  userId,
  initialValue,
  onSuccess,
  onCancel,
  onError,
  requiresPayment = false,
  paymentAmount = 0,
  members
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    team_name: initialValue,
    online_id: initialValue,
    platform: 'psn', // Default platform
    captain_id: userId,
    old_captain_id: '',
    team_id: teamId,
    new_captain_id: '',
    roster_changes: [],
    player_id: userId,
    operation: 'add',
    new_role: 'player',
    league_id: '',
    season: 1,
    player_ids: members?.map(m => m.user_id) || [],
    tournament_id: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const requestService = new RequestService();

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission based on action type
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Different validations based on action type
    if (actionType === 'team_rebrand' && !formData.team_name) {
      onError?.('Team name is required');
      return;
    }
    
    if (actionType === 'online_id_change' && !formData.online_id) {
      onError?.('New online ID is required');
      return;
    }
    
    if (actionType === 'team_creation' && !formData.team_name) {
      onError?.('Team name is required');
      return;
    }
    
    // Show confirmation dialog if required
    if (requiresPayment) {
      setShowConfirmation(true);
    } else {
      handleSubmit();
    }
  };

  // Process the request based on action type
  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      // Create the request data based on the action type
      let requestData: RequestData;
      
      switch (actionType) {
        case 'team_rebrand':
          requestData = {
            request_id: uuidv4(),
            request_type: 'team_rebrand',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            old_name: initialValue || '',
            new_name: formData.team_name!,
            payment_data: requiresPayment ? { amount: paymentAmount } : undefined
          } as TeamRebrandRequest;
          break;
          
        case 'online_id_change':
          requestData = {
            request_id: uuidv4(),
            request_type: 'online_id_change',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            player_id: formData.player_id || userId,
            old_online_id: initialValue,
            new_online_id: formData.online_id!,
            platform: formData.platform || 'psn',
            payment_data: requiresPayment ? { amount: paymentAmount } : undefined
          } as OnlineIdChangeRequest;
          break;
          
        case 'team_creation':
          requestData = {
            request_id: uuidv4(),
            request_type: 'team_creation',
            team_id: uuidv4(), // Generate a new team ID
            requested_by: userId,
            requires_payment: requiresPayment,
            team_name: formData.team_name!,
            captain_id: userId,
            league_id: formData.league_id,
            payment_data: requiresPayment ? { amount: paymentAmount } : undefined
          } as TeamCreationRequest;
          break;
          
        case 'team_transfer':
          requestData = {
            request_id: uuidv4(),
            request_type: 'team_transfer',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            new_captain_id: formData.new_captain_id!,
            old_captain_id: formData.old_captain_id || userId,
            payment_data: requiresPayment ? { amount: paymentAmount } : undefined
          } as TeamTransferRequest;
          break;
          
        case 'roster_change':
          requestData = {
            request_id: uuidv4(),
            request_type: 'roster_change',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            player_id: formData.player_id!,
            operation: formData.operation || 'add',
            new_role: formData.new_role,
            payment_data: requiresPayment ? { amount: paymentAmount } : undefined
          } as RosterChangeRequest;
          break;
          
        case 'league_registration':
          requestData = {
            request_id: uuidv4(),
            request_type: 'league_registration',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            league_id: formData.league_id!,
            season: formData.season || 1,
            player_ids: formData.player_ids || [],
            payment_data: requiresPayment ? { amount: paymentAmount } : undefined
          } as LeagueRegistrationRequest;
          break;
          
        case 'tournament_registration':
          requestData = {
            request_id: uuidv4(),
            request_type: 'tournament_registration',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            tournament_id: formData.tournament_id!,
            player_ids: formData.player_ids || [],
            payment_data: requiresPayment ? { amount: paymentAmount } : undefined
          } as TournamentRegistrationRequest;
          break;
      }
      
      // Process the request
      const service = new RequestService();
      const response = await service.processRequest(requestData);
      
      if (response.success === false) {
        onError?.(response.error || 'Failed to process request');
      } else {
        onSuccess?.(response);
      }
    } catch (error) {
      onError?.('An error occurred while processing the request');
      console.error('Team action processing error:', error);
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  // Render form based on action type
  const renderForm = () => {
    switch (actionType) {
      case 'team_rebrand':
        return (
          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Team Name</span>
              </label>
              <input
                type="text"
                name="team_name"
                value={formData.team_name}
                onChange={handleInputChange}
                className="input input-bordered"
                required
                title="Team Name"
                aria-label="Team Name"
              />
            </div>
          </div>
        );
        
      case 'online_id_change':
        return (
          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Online ID</span>
              </label>
              <input
                type="text"
                name="online_id"
                value={formData.online_id}
                onChange={handleInputChange}
                className="input input-bordered"
                required
                title="Online ID"
                aria-label="Online ID"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Platform</span>
              </label>
              <select
                name="platform"
                value={formData.platform}
                onChange={handleInputChange}
                className="select select-bordered"
                title="Gaming Platform"
                aria-label="Gaming Platform"
              >
                <option value="psn">PlayStation Network</option>
                <option value="xbox">Xbox Live</option>
                <option value="steam">Steam</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        );
      
      case 'team_creation':
        return (
          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Team Name</span>
              </label>
              <input
                type="text"
                name="team_name"
                value={formData.team_name}
                onChange={handleInputChange}
                className="input input-bordered"
                required
                title="Team Name"
                aria-label="Team Name"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">League (Optional)</span>
              </label>
              <input
                type="text"
                name="league_id"
                value={formData.league_id}
                onChange={handleInputChange}
                className="input input-bordered"
                title="League ID"
                aria-label="League ID"
              />
            </div>
          </div>
        );
        
      case 'team_transfer':
        return (
          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">New Captain</span>
              </label>
              <select
                name="new_captain_id"
                value={formData.new_captain_id}
                onChange={handleInputChange}
                className="select select-bordered"
                required
                title="New Captain"
                aria-label="New Captain"
              >
                <option value="">Select a Team Member</option>
                {members && members.map((member: any) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.user_name || `User ${member.user_id.substring(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
        
      case 'roster_change':
        return (
          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Player</span>
              </label>
              <select
                name="player_id"
                value={formData.player_id}
                onChange={handleInputChange}
                className="select select-bordered"
                required
                title="Player"
                aria-label="Player"
              >
                <option value="">Select a Player</option>
                {members && members.map((member: any) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.user_name || `User ${member.user_id.substring(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Operation</span>
              </label>
              <select
                name="operation"
                value={formData.operation}
                onChange={handleInputChange}
                className="select select-bordered"
                required
                title="Operation"
                aria-label="Operation"
              >
                <option value="add">Add to Roster</option>
                <option value="remove">Remove from Roster</option>
                <option value="update">Update Role</option>
              </select>
            </div>
            {formData.operation === 'update' && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Role</span>
                </label>
                <input
                  type="text"
                  name="new_role"
                  value={formData.new_role}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  required
                  title="New Role"
                  aria-label="New Role"
                />
              </div>
            )}
          </div>
        );
        
      case 'league_registration':
        return (
          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">League ID</span>
              </label>
              <input
                type="text"
                name="league_id"
                value={formData.league_id}
                onChange={handleInputChange}
                className="input input-bordered"
                required
                title="League ID"
                aria-label="League ID"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Season</span>
              </label>
              <input
                type="number"
                name="season"
                value={formData.season}
                onChange={handleInputChange}
                className="input input-bordered"
                title="Season"
                aria-label="Season"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Players</span>
              </label>
              <div className="flex flex-col gap-2 p-4 border rounded-lg">
                {members ? members.map((member: any) => (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.player_ids?.includes(member.user_id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          player_ids: checked 
                            ? [...(prev.player_ids || []), member.user_id]
                            : (prev.player_ids || []).filter(id => id !== member.user_id)
                        }));
                      }}
                      className="checkbox"
                      title={`Select ${member.user?.user_name || `User ${member.user_id.substring(0, 8)}`}`}
                      aria-label={`Select ${member.user?.user_name || `User ${member.user_id.substring(0, 8)}`}`}
                    />
                    <span>{member.user?.user_name || `User ${member.user_id.substring(0, 8)}`}</span>
                  </div>
                )) : <p>No team members found</p>}
              </div>
            </div>
          </div>
        );
        
      case 'tournament_registration':
        return (
          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Tournament ID</span>
              </label>
              <input
                type="text"
                name="tournament_id"
                value={formData.tournament_id}
                onChange={handleInputChange}
                className="input input-bordered"
                required
                title="Tournament ID"
                aria-label="Tournament ID"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Players</span>
              </label>
              <div className="flex flex-col gap-2 p-4 border rounded-lg">
                {members ? members.map((member: any) => (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.player_ids?.includes(member.user_id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          player_ids: checked 
                            ? [...(prev.player_ids || []), member.user_id]
                            : (prev.player_ids || []).filter(id => id !== member.user_id)
                        }));
                      }}
                      className="checkbox"
                      title={`Select ${member.user?.user_name || `User ${member.user_id.substring(0, 8)}`}`}
                      aria-label={`Select ${member.user?.user_name || `User ${member.user_id.substring(0, 8)}`}`}
                    />
                    <span>{member.user?.user_name || `User ${member.user_id.substring(0, 8)}`}</span>
                  </div>
                )) : <p>No team members found</p>}
              </div>
            </div>
          </div>
        );
        
      default:
        return <p>Unknown action type</p>;
    }
  };

  // Get action title for displaying
  const getActionTitle = () => {
    switch (actionType) {
      case 'team_rebrand':
        return 'Change Team Name';
      case 'online_id_change':
        return 'Change Online ID';
      case 'team_creation':
        return 'Create New Team';
      case 'team_transfer':
        return 'Transfer Team Ownership';
      case 'roster_change':
        return 'Modify Team Roster';
      case 'league_registration':
        return 'Register for League';
      case 'tournament_registration':
        return 'Register for Tournament';
      default:
        return 'Process Action';
    }
  };

  // Get action description for confirmation dialog
  const getActionDescription = () => {
    switch (actionType) {
      case 'team_rebrand':
        return `Change team name to "${formData.team_name}"`;
      case 'online_id_change':
        return `Change online ID to "${formData.online_id}" (${formData.platform})`;
      case 'team_creation':
        return `Create new team "${formData.team_name}"`;
      case 'team_transfer':
        const newCaptainName = members?.find((m: any) => m.user_id === formData.new_captain_id)?.user?.user_name || formData.new_captain_id;
        return `Transfer team ownership to ${newCaptainName}`;
      case 'roster_change':
        const playerName = members?.find((m: any) => m.user_id === formData.player_id)?.user?.user_name || formData.player_id;
        return `${formData.operation === 'add' ? 'Add' : formData.operation === 'remove' ? 'Remove' : 'Update'} player ${playerName}`;
      case 'league_registration':
        return `Register team for league ${formData.league_id}`;
      case 'tournament_registration':
        return `Register team for tournament ${formData.tournament_id}`;
      default:
        return 'Process team action';
    }
  };

  return (
    <div className="bg-base-200 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">
        {getActionTitle()}
        {isLoading && <span className="loading loading-spinner loading-md ml-2"></span>}
      </h2>
      
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
        {renderForm()}
        
        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost"
            disabled={isLoading}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {requiresPayment ? `Continue (${paymentAmount} credits)` : 'Submit'}
          </button>
        </div>
      </form>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        title="Confirm Action"
        message={getActionDescription()}
        confirmText={requiresPayment ? 'Continue to Payment' : 'Confirm'}
        cancelText="Cancel"
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirmation(false)}
      />
    </div>
  );
};

export default TeamActionProcessor; 