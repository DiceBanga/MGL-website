import React, { useState, useEffect } from 'react';
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
import TeamRebrandForm from './TeamRebrandForm';
import { toast } from 'react-hot-toast';
import { Team } from '../types/team';
import { User } from '../types/user';
import { Player } from '../types/player';
import { supabase } from '../lib/supabase';
import RenamingForm from './team-actions/RenamingForm';

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
  team?: Team;
  user?: User;
  onClose?: () => void;
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
  members,
  team,
  user,
  onClose = () => {}
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
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [teamMembers, setTeamMembers] = useState<Player[]>([]);
  const requestService = new RequestService();

  useEffect(() => {
    if (actionType === 'team_transfer' && team?.id) {
      fetchTeamMembers();
    }
  }, [actionType, team?.id]);

  const fetchTeamMembers = async () => {
    if (!team?.id || !user?.id) return;

    try {
      const { data: members, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', team.id)
        .neq('id', user.id);

      if (error) throw error;
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission based on action type
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Different validations based on action type
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

  // Get action description for confirmation dialog
  const getActionDescription = (): string => {
    switch (actionType) {
      case 'online_id_change':
        return `Change online ID to "${formData.online_id}" (${formData.platform})`;
      case 'team_creation':
        return `Create new team "${formData.team_name}"`;
      case 'team_transfer':
        const newCaptainName = members?.find((m: any) => m.user_id === formData.new_captain_id)?.display_name || formData.new_captain_id;
        return `Transfer team ownership to ${newCaptainName}`;
      case 'roster_change':
        const playerName = members?.find((m: any) => m.user_id === formData.player_id)?.display_name || formData.player_id;
        return `${formData.operation === 'add' ? 'Add' : formData.operation === 'remove' ? 'Remove' : 'Update'} player ${playerName}`;
      case 'league_registration':
        return `Register team for league ${formData.league_id}`;
      case 'tournament_registration':
        return `Register team for tournament ${formData.tournament_id}`;
      default:
        return 'Process team action';
    }
  };

  // Render form based on action type
  const renderActionForm = () => {
    switch (actionType) {
      case 'online_id_change':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="online_id" className="block text-sm font-medium text-gray-200 mb-1">
                New Online ID
              </label>
              <input
                type="text"
                id="online_id"
                name="online_id"
                value={formData.online_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700/50 border border-blue-500/30 focus:border-blue-500 focus:ring focus:ring-blue-500/20 rounded-lg text-white"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="platform" className="block text-sm font-medium text-gray-200 mb-1">
                Platform
              </label>
              <select
                id="platform"
                name="platform"
                value={formData.platform}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700/50 border border-blue-500/30 focus:border-blue-500 focus:ring focus:ring-blue-500/20 rounded-lg text-white"
              >
                <option value="psn">PlayStation Network</option>
                <option value="xbox">Xbox Live</option>
                <option value="steam">Steam</option>
                <option value="other">Other</option>
              </select>
            </div>
          </>
        );
        
      case 'team_creation':
        return (
          <div className="mb-4">
            <label htmlFor="team_name" className="block text-sm font-medium text-gray-200 mb-1">
              Team Name
            </label>
            <input
              type="text"
              id="team_name"
              name="team_name"
              value={formData.team_name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-gray-700/50 border border-emerald-500/30 focus:border-emerald-500 focus:ring focus:ring-emerald-500/20 rounded-lg text-white"
              required
            />
          </div>
        );
        
      case 'team_transfer':
        return (
          <div className="mb-4">
            <label htmlFor="new_captain_id" className="block text-sm font-medium text-gray-200 mb-1">
              Transfer Ownership To
            </label>
            <select
              id="new_captain_id"
              name="new_captain_id"
              value={formData.new_captain_id}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-gray-700/50 border border-blue-500/30 focus:border-blue-500 focus:ring focus:ring-blue-500/20 rounded-lg text-white"
              required
            >
              <option value="">Select New Captain</option>
              {members?.filter(member => member.user_id !== userId).map(member => (
                <option key={member.user_id} value={member.user_id}>
                  {member.display_name || member.username || member.user_id}
                </option>
              ))}
            </select>
          </div>
        );
        
      case 'roster_change':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="player_id" className="block text-sm font-medium text-gray-200 mb-1">
                Player
              </label>
              <select
                id="player_id"
                name="player_id"
                value={formData.player_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700/50 border border-purple-500/30 focus:border-purple-500 focus:ring focus:ring-purple-500/20 rounded-lg text-white"
                required
              >
                <option value="">Select a Player</option>
                {members?.map(member => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.display_name || `Player ${member.user_id.substring(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="operation" className="block text-sm font-medium text-gray-200 mb-1">
                Operation
              </label>
              <select
                id="operation"
                name="operation"
                value={formData.operation}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700/50 border border-purple-500/30 focus:border-purple-500 focus:ring focus:ring-purple-500/20 rounded-lg text-white"
                required
              >
                <option value="add">Add to Roster</option>
                <option value="remove">Remove from Roster</option>
                <option value="update">Update Role</option>
              </select>
            </div>
            {formData.operation === 'update' && (
              <div className="mb-4">
                <label htmlFor="new_role" className="block text-sm font-medium text-gray-200 mb-1">
                  New Role
                </label>
                <input
                  type="text"
                  id="new_role"
                  name="new_role"
                  value={formData.new_role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-purple-500/30 focus:border-purple-500 focus:ring focus:ring-purple-500/20 rounded-lg text-white"
                  required
                />
              </div>
            )}
          </>
        );
        
      default:
        return <p className="text-gray-300">Please select an action type</p>;
    }
  };

  // Process the request based on action type
  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      // Generate a consistent request ID for both the request and payment reference
      const requestId = uuidv4();
      let requestData: RequestData | undefined;
      
      switch (actionType) {
        case 'online_id_change':
          requestData = {
            request_id: requestId,
            request_type: 'online_id_change',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            player_id: formData.player_id || userId,
            old_online_id: initialValue,
            new_online_id: formData.online_id!,
            platform: formData.platform || 'psn',
            payment_data: requiresPayment ? { 
              amount: paymentAmount,
              metadata: { request_id: requestId }
            } : undefined
          } as OnlineIdChangeRequest;
          break;
          
        case 'team_creation':
          requestData = {
            request_id: requestId,
            request_type: 'team_creation',
            team_id: uuidv4(), // Generate a new team ID
            requested_by: userId,
            requires_payment: requiresPayment,
            team_name: formData.team_name!,
            captain_id: userId,
            league_id: formData.league_id,
            payment_data: requiresPayment ? { 
              amount: paymentAmount,
              metadata: { request_id: requestId }
            } : undefined
          } as TeamCreationRequest;
          break;
          
        case 'team_transfer':
          // Get team and player names for metadata
          const newCaptain = members?.find(m => m.user_id === formData.new_captain_id);
          const teamName = initialValue || 'Unknown Team';
          const itemId = '1002'; // Default item ID for team transfers
          
          // Create payment details first
          const paymentDetails = {
            id: uuidv4(),
            type: 'team_transfer',
            name: 'Team Ownership Transfer',
            amount: paymentAmount,
            description: `Transfer ownership of ${teamName} to ${newCaptain?.display_name || 'new captain'}`,
            teamId: teamId,
            captainId: userId,
            playersIds: [],
            playerId: formData.new_captain_id!,
            request_id: requestId,
            referenceId: `${itemId}-${requestId.replace(/-/g, '')}`,
            item_id: itemId,
            metadata: {
              requestType: 'team_transfer',
              oldCaptainId: userId,
              oldCaptainName: userId,
              newCaptainId: formData.new_captain_id!,
              newCaptainName: newCaptain?.display_name || 'new captain',
              teamName: teamName,
              requestId: requestId,
              changeRequestData: {
                teamId: teamId,
                requestedBy: userId,
                itemId: itemId,
                playerId: formData.new_captain_id!,
                oldValue: userId,
                newValue: formData.new_captain_id!,
                requestId: requestId,
                metadata: {
                  oldCaptainName: userId,
                  newCaptainName: newCaptain?.display_name || 'new captain',
                  teamName: teamName,
                  requestId: requestId
                }
              }
            }
          };

          requestData = {
            request_id: requestId,
            request_type: 'team_transfer',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            new_captain_id: formData.new_captain_id!,
            old_captain_id: userId,
            item_id: itemId,
            payment_data: requiresPayment ? paymentDetails : undefined
          } as TeamTransferRequest;
          break;
          
        case 'roster_change':
          requestData = {
            request_id: requestId,
            request_type: 'roster_change',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            player_id: formData.player_id!,
            operation: formData.operation || 'add',
            new_role: formData.new_role,
            payment_data: requiresPayment ? { 
              amount: paymentAmount,
              metadata: { request_id: requestId }
            } : undefined
          } as RosterChangeRequest;
          break;
          
        case 'league_registration':
          requestData = {
            request_id: requestId,
            request_type: 'league_registration',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            league_id: formData.league_id!,
            season: formData.season || 1,
            player_ids: formData.player_ids || [],
            payment_data: requiresPayment ? { 
              amount: paymentAmount,
              metadata: { request_id: requestId }
            } : undefined
          } as LeagueRegistrationRequest;
          break;
          
        case 'tournament_registration':
          requestData = {
            request_id: requestId,
            request_type: 'tournament_registration',
            team_id: teamId!,
            requested_by: userId,
            requires_payment: requiresPayment,
            tournament_id: formData.tournament_id!,
            player_ids: formData.player_ids || [],
            payment_data: requiresPayment ? { 
              amount: paymentAmount,
              metadata: { request_id: requestId }
            } : undefined
          } as TournamentRegistrationRequest;
          break;
      }
      
      // If we have request data, process the request
      if (requestData) {
        const response = await requestService.processRequest(requestData);
        
        if (response.success === false) {
          onError?.(response.error || 'Failed to process request');
        } else {
          onSuccess?.(response);
        }
      } else {
        onError?.('Invalid action type');
      }
    } catch (error) {
      onError?.('An error occurred while processing the request');
      console.error('Team action processing error:', error);
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleTransferConfirm = async () => {
    if (!selectedPlayer || !team || !user) {
      toast.error('Missing required data for transfer');
      return;
    }

    try {
      setIsLoading(true);
      const requestService = new RequestService();
      
      const request = requestService.createTeamTransferRequest({
        teamId: team.id,
        userId: user.id,
        newCaptainId: selectedPlayer.id,
        teamName: team.name,
        newCaptainName: selectedPlayer.name,
        amount: 2000 // $20.00 in cents
      });

      const result = await requestService.processRequest(request);
      
      if (result.payment_url) {
        window.location.href = result.payment_url;
      } else {
        toast.success('Team transfer request submitted successfully');
        onClose();
      }
    } catch (error) {
      console.error('Error processing team transfer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process team transfer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferClick = () => {
    if (!selectedPlayer) return;
    setShowConfirmation(true);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  // If the action type is team_rebrand, render the TeamRebrandForm
  if (actionType === 'team_rebrand') {
    return (
      <TeamRebrandForm
        teamId={teamId!}
        userId={userId}
        currentName={initialValue || ''}
        onCancel={onCancel || (() => {})}
        onSuccess={onSuccess || (() => {})}
      />
    );
  }

  if (showConfirmation) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Confirm Team Transfer</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800">
            Are you sure you want to transfer ownership of <strong>{team?.name}</strong> to{' '}
            <strong>{members?.find(m => m.user_id === formData.new_captain_id)?.display_name || formData.new_captain_id}</strong>?
          </p>
          <p className="mt-2 text-yellow-700">
            This action will:
          </p>
          <ul className="list-disc list-inside mt-2 text-yellow-700 space-y-1">
            <li>Remove your captain privileges</li>
            <li>Make {members?.find(m => m.user_id === formData.new_captain_id)?.display_name || formData.new_captain_id} the new team captain</li>
            <li>Charge a $20.00 transfer fee</li>
          </ul>
          <p className="mt-3 text-yellow-800 font-medium">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            onClick={handleCancelConfirmation}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            onClick={handleTransferConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm Transfer'}
          </button>
        </div>
      </div>
    );
  }

  // If we don't have required data, show loading or error state
  if (actionType === 'team_transfer' && (!team || !user)) {
    return (
      <div className="p-4">
        <div className="text-gray-500 text-center py-4">
          Loading team data...
        </div>
      </div>
    );
  }

  // Otherwise, render the form for other action types
  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-6">
        {actionType === 'team_transfer' ? 'Transfer Team Ownership' :
         actionType === 'online_id_change' ? 'Change Online ID' :
         actionType === 'roster_change' ? 'Update Team Roster' :
         actionType === 'team_creation' ? 'Create New Team' :
         actionType === 'league_registration' ? 'Register for League' :
         actionType === 'tournament_registration' ? 'Register for Tournament' :
         'Process Request'}
      </h2>
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {renderActionForm()}
        
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex justify-center items-center"
          >
            {requiresPayment ? `Continue (${paymentAmount}$)` : 'Submit'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Cancel
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