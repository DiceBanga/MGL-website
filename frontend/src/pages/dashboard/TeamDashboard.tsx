import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Edit, UserPlus, Trash, RefreshCw, DollarSign, Users, Trophy, UserCog, Paintbrush, ChevronRight } from 'lucide-react';
import { DbTeam, DbTeamMember } from '../../types/database';
import { createPaymentDetails } from '../../utils/paymentUtils';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { v4 as uuidv4 } from 'uuid';
import TeamActionProcessor from '../../components/TeamActionProcessor';

// UI-specific interface that matches the team_players table structure
interface TeamMemberUI {
  id: string; // This will be set to user_id
  team_id: string;
  user_id: string;
  role: string;
  jersey_number: number | null;
  can_be_deleted: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    avatar_url?: string | null;
    online_id?: string | null; // This comes from the league_roster table
  };
}

// Interface for team data with UI-specific properties
interface TeamUI extends DbTeam {
  members: TeamMemberUI[];
}

const TeamDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [team, setTeam] = useState<TeamUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [newOnlineId, setNewOnlineId] = useState('');
  const [isEditingOnlineId, setIsEditingOnlineId] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);
  const [leagueRosters, setLeagueRosters] = useState<any[]>([]);
  const [tournamentRosters, setTournamentRosters] = useState<any[]>([]);
  const [userOnRoster, setUserOnRoster] = useState(false);
  
  // Front Office state
  const [showFrontOffice, setShowFrontOffice] = useState(true);
  const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([]);
  const [itemPrices, setItemPrices] = useState<{[key: string]: number}>({});
  const [itemIds, setItemIds] = useState<{[key: string]: string}>({});
  
  // Confirmation dialog states
  const [showOnlineIdConfirmation, setShowOnlineIdConfirmation] = useState(false);
  const [showRebrandConfirmation, setShowRebrandConfirmation] = useState(false);
  
  // Add new state variables for player signing
  const [showPlayerSigningForm, setShowPlayerSigningForm] = useState(false);
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [signingError, setSigningError] = useState<string | null>(null);
  
  // Add new state for player signing confirmation
  const [showPlayerSigningConfirmation, setShowPlayerSigningConfirmation] = useState(false);

  // Action processor states
  const [showTeamRebrandProcessor, setShowTeamRebrandProcessor] = useState(false);
  const [showOnlineIdProcessor, setShowOnlineIdProcessor] = useState(false);
  const [showLeagueRegistrationProcessor, setShowLeagueRegistrationProcessor] = useState(false);
  const [showTournamentRegistrationProcessor, setShowTournamentRegistrationProcessor] = useState(false);
  const [showRosterChangeProcessor, setShowRosterChangeProcessor] = useState(false);
  const [showTeamTransferProcessor, setShowTeamTransferProcessor] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTeamData();
      fetchAvailableEvents();
      fetchItemPrices();
    }
  }, [user]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parse UUID from URL
      const urlPathSegments = window.location.pathname.split('/');
      const teamIdIndex = urlPathSegments.findIndex(segment => segment === 'team') + 1;
      const teamIdFromUrl = teamIdIndex < urlPathSegments.length ? urlPathSegments[teamIdIndex] : null;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!teamIdFromUrl || !uuidRegex.test(teamIdFromUrl)) {
        console.error('Invalid team ID in URL:', teamIdFromUrl);
        setError('Invalid team ID');
        setLoading(false);
        return;
      }
      
      console.log('Fetching team data for ID:', teamIdFromUrl);

      // Query to fetch team with the given ID
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*, captain:captain_id(id, user_name, email)')
        .eq('id', teamIdFromUrl)
        .single();

      if (teamError) {
        console.error('Error fetching team data:', teamError);
        setError(teamError.message);
        setLoading(false);
        return;
      }

      if (!teamData) {
        console.log('No team found with ID:', teamIdFromUrl);
        setLoading(false);
        return;
      }

      // Set whether the current user is the team captain
      const isCaptainUser = teamData.captain_id === user?.id;
      setIsCaptain(isCaptainUser);

      // Fetch all members of the team - this includes league roster
      const { data: leagueRosterData, error: leagueRosterError } = await supabase
        .from('league_roster')
        .select('*, user:user_id(id, user_name, email)')
        .eq('team_id', teamData.id);

      if (leagueRosterError) {
        console.error('Error fetching league roster:', leagueRosterError);
        setError(leagueRosterError.message);
      }

      // Fetch tournament roster
      const { data: tournamentRosterData, error: tournamentRosterError } = await supabase
        .from('tournament_roster')
        .select('*, user:user_id(id, user_name, email)')
        .eq('team_id', teamData.id);

      if (tournamentRosterError) {
        console.error('Error fetching tournament roster:', tournamentRosterError);
        setError(tournamentRosterError.message);
      }

      // Check if user is on any roster
      const userOnAnyRoster = 
        (leagueRosterData && leagueRosterData.some(player => player.user_id === user?.id)) || 
        (tournamentRosterData && tournamentRosterData.some(player => player.user_id === user?.id));
      
      setUserOnRoster(userOnAnyRoster || false);
      setLeagueRosters(leagueRosterData || []);
      setTournamentRosters(tournamentRosterData || []);
      setTeam(teamData);
      setNewTeamName(teamData.name);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchTeamData:', error);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const fetchAvailableEvents = async () => {
    try {
      // Fetch available tournaments
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id, name, status, payment_amount')
        .eq('status', 'registration')
        .order('name');
        
      if (!tournamentsError && tournamentsData) {
        setAvailableTournaments(tournamentsData);
      } else {
        console.error('Error fetching tournaments:', tournamentsError);
      }
      
      // Fetch available leagues
      const { data: leaguesData, error: leaguesError } = await supabase
        .from('leagues')
        .select('id, name, status, payment_amount')
        .eq('status', 'active')
        .order('name');
        
      if (!leaguesError && leaguesData) {
        setAvailableLeagues(leaguesData);
      } else {
        console.error('Error fetching leagues:', leaguesError);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };
  
  const fetchItemPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, item_id, current_price, item_name')
        .in('item_name', [
          'Team Creation', 
          'Team Transfer', 
          'Tournament Registration', 
          'League Registration', 
          'Roster Change', 
          'Team Rebrand', 
          'Gamer Tag Change'
        ]); 
        
      if (!error && data) {
        const prices: {[key: string]: number} = {};
        const ids: {[key: string]: string} = {};
        
        data.forEach(item => {
          // Store by item name for easier reference
          prices[item.item_name] = item.current_price;
          ids[item.item_name] = item.item_id;
          
          // Also store by item_id for backward compatibility
          prices[item.item_id] = item.current_price;
        });
        
        setItemPrices(prices);
        setItemIds(ids);
        console.log('Fetched item data:', data);
      } else {
        console.error('Error fetching item prices:', error);
      }
    } catch (err) {
      console.error('Error fetching item prices:', err);
    }
  };

  const createTeamChangeRequest = async (
    requestType: string,
    teamId: string,
    requestedBy: string,
    itemId: string,
    paymentId: string,
    options: {
      tournamentId?: string;
      leagueId?: string;
      playerId?: string;
      oldValue?: string;
      newValue?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    try {
      const { tournamentId, leagueId, playerId, oldValue, newValue, metadata } = options;
      
      // Generate a UUID for the request ID
      const requestId = uuidv4();
      
      const { data, error } = await supabase
        .from('team_change_requests')
        .insert({
          id: requestId, // Use a UUID for the request ID
          team_id: teamId,
          request_type: requestType,
          requested_by: requestedBy,
          tournament_id: tournamentId,
          league_id: leagueId,
          player_id: playerId,
          old_value: oldValue,
          new_value: newValue,
          status: 'pending',
          payment_id: paymentId,
          item_id: itemId,
          metadata
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating team change request:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Error creating team change request:', err);
      return null;
    }
  };

  const handleEditTeamName = () => {
    // Show the team rebrand processor instead of setting isEditingName
    setShowTeamRebrandProcessor(true);
  };

  // Handle success from team rebrand request
  const handleRebrandSuccess = (response: any) => {
    console.log('Team rebrand successful:', response);
    setShowTeamRebrandProcessor(false);
    // Refresh team data to show the updated name
    fetchTeamData();
  };

  // Handle cancellation of team rebrand
  const handleRebrandCancel = () => {
    setShowTeamRebrandProcessor(false);
  };

  const handleEditOnlineId = (playerId: string) => {
    // Set the selected player ID and show the online ID processor
    setSelectedPlayerId(playerId);
    
    // Find the player's current online_id
    const player = team?.members.find(member => member.user_id === playerId);
    if (player) {
      // Get online_id from the user object
      const onlineId = player.user?.online_id || '';
      setNewOnlineId(onlineId);
    }
    
    setShowOnlineIdProcessor(true);
  };

  // Handle success from online ID change request
  const handleOnlineIdSuccess = (response: any) => {
    console.log('Online ID change successful:', response);
    setShowOnlineIdProcessor(false);
    setSelectedPlayerId(null);
    // Refresh team data to show the updated online ID
    fetchTeamData();
  };

  // Handle cancellation of online ID change
  const handleOnlineIdCancel = () => {
    setShowOnlineIdProcessor(false);
    setSelectedPlayerId(null);
  };

  const handleSaveTeamName = async () => {
    if (!team || !newTeamName.trim()) return;

    try {
      // Check if the name is different
      if (newTeamName === team.name) {
        setIsEditingName(false);
        return;
      }

      // If the name is different, we need to process a payment
      setShowRebrandConfirmation(true);
    } catch (err) {
      console.error(err);
      setError('Failed to update team name');
    }
  };

  const processTeamRebrandPayment = async () => {
    if (!team || !user || !newTeamName.trim()) return;
    
    try {
      setProcessingPayment(true);
      
      // Get the price from the itemPrices state
      const price = itemPrices['Team Rebrand'] || 20.00; // Default to 20.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['Team Rebrand'] || '1006'; // Use the fetched item_id or default to '1006'
      console.log('Using item ID from database for team rebrand:', itemId);
      
      // Create payment details for team rebranding
      const paymentDetails = createPaymentDetails(
        'team_rebrand',
        'Team Name Change',
        price,
        `Change team name from "${team.name}" to "${newTeamName}"`,
        {
          teamId: team.id,
          captainId: user.id,
          item_id: itemId,
          request_id: requestId
        }
      );
      
      // Add metadata for the team change request
      paymentDetails.metadata = {
        requestType: 'team_rebrand',
        oldTeamName: team.name,
        newTeamName: newTeamName,
        requestId: requestId,
        // Store the data needed for creating the team change request
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          oldValue: team.name,
          newValue: newTeamName,
          metadata: {
            oldTeamName: team.name,
            newTeamName: newTeamName
          }
        }
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails,
          changeRequestType: 'team_rebrand'
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to process payment for team name change');
      setProcessingPayment(false);
      setShowRebrandConfirmation(false);
    }
  };

  const handleSaveOnlineId = async () => {
    if (!selectedPlayerId || !newOnlineId.trim()) return;

    // Find the player
    const player = team?.members.find(member => member.user_id === selectedPlayerId);
    if (!player) return;

    // Check if the online ID is different
    if (player.user?.online_id === newOnlineId) {
      setIsEditingOnlineId(false);
      return;
    }

    // If the online ID is different, we need to process a payment
    setShowOnlineIdConfirmation(true);
  };

  const processOnlineIdChangePayment = async () => {
    if (!team || !user || !selectedPlayerId || !newOnlineId.trim()) return;
    
    try {
      setProcessingPayment(true);
      
      // Find the player in the members array
      const player = team.members.find(member => member.user_id === selectedPlayerId);
      if (!player) {
        throw new Error('Player not found');
      }
      
      // Get the current online ID from the user object
      const currentOnlineId = player.user?.online_id || 'None';
      
      // Get the price from the itemPrices state
      const price = itemPrices['Gamer Tag Change'] || 5.00; // Default to 5.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['Gamer Tag Change'] || '1007'; // Use the fetched item_id or default to '1007'
      console.log('Using item ID from database for online ID change:', itemId);
      
      // Create payment details for online ID change
      const paymentDetails = createPaymentDetails(
        'online_id_change',
        'Online ID Change',
        price,
        `Change online ID from "${currentOnlineId}" to "${newOnlineId}"`,
        {
          teamId: team.id,
          captainId: user.id,
          playerId: selectedPlayerId,
          item_id: itemId,
          request_id: requestId
        }
      );
      
      // Add metadata for the team change request
      paymentDetails.metadata = {
        requestType: 'online_id_change',
        playerId: selectedPlayerId,
        playerName: player.user?.username || selectedPlayerId,
        oldOnlineId: currentOnlineId,
        newOnlineId: newOnlineId,
        requestId: requestId,
        // Store the data needed for creating the team change request
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          playerId: selectedPlayerId,
          oldValue: currentOnlineId,
          newValue: newOnlineId,
          metadata: {
            playerName: player.user?.username || selectedPlayerId,
            oldOnlineId: currentOnlineId,
            newOnlineId: newOnlineId
          }
        }
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails,
          changeRequestType: 'online_id_change'
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to process payment for online ID change');
      setProcessingPayment(false);
      setShowOnlineIdConfirmation(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!team) return;

    try {
      const { error } = await supabase
        .from('team_players')
        .delete()
        .eq('user_id', playerId)
        .eq('team_id', team.id);

      if (error) throw error;

      // Update the local state
      setTeam({
        ...team,
        members: team.members.filter(member => member.user_id === playerId ? false : true)
      });
    } catch (err) {
      console.error(err);
      setError('Failed to remove player from team');
    }
  };

  const handleAddPlayer = () => {
    if (!team) return;
    navigate('/dashboard/add-player', { state: { teamId: team.id } });
  };

  const handleJoinTournament = (tournamentId: string, tournamentName: string, price: number) => {
    if (!team || !user) return;
    
    try {
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['Tournament Registration'] || '1003'; // Use the fetched item_id or default to '1003'
      console.log('Using item ID from database for tournament registration:', itemId);
      
      // Create payment details for tournament registration
      const paymentDetails = createPaymentDetails(
        'tournament',
        'Tournament Registration',
        price,
        `Registration for ${tournamentName}`,
        {
          teamId: team.id,
          captainId: user.id,
          eventId: tournamentId,
          item_id: itemId,
          playersIds: team.members.map(member => member.user_id), // Include all team members
          request_id: requestId
        }
      );
      
      // Add metadata for the registration
      paymentDetails.metadata = {
        tournamentId,
        tournamentName,
        teamId: team.id,
        teamName: team.name,
        requestId,
        // No need for changeRequestData as tournament registrations are handled differently
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails
          // No changeRequestType as tournament registrations are handled by updateRegistrationStatus
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to process tournament registration');
    }
  };
  
  const handleJoinLeague = (leagueId: string, leagueName: string, price: number) => {
    if (!team || !user) return;
    
    try {
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['League Registration'] || '1004'; // Use the fetched item_id or default to '1004'
      console.log('Using item ID from database for league registration:', itemId);
      
      // Create payment details for league registration
      const paymentDetails = createPaymentDetails(
        'league',
        'League Registration',
        price,
        `Registration for ${leagueName}`,
        {
          teamId: team.id,
          captainId: user.id,
          eventId: leagueId,
          item_id: itemId,
          playersIds: team.members.map(member => member.user_id), // Include all team members
          request_id: requestId
        }
      );
      
      // Add metadata for the registration
      paymentDetails.metadata = {
        leagueId,
        leagueName,
        teamId: team.id,
        teamName: team.name,
        requestId,
        // No need for changeRequestData as league registrations are handled differently
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails
          // No changeRequestType as league registrations are handled by updateRegistrationStatus
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to process league registration');
    }
  };
  
  const handleTransferOwnership = (newCaptainId: string, newCaptainName: string) => {
    if (!team || !user) return;
    
    try {
      console.log('Starting team transfer process with the following data:');
      console.log('Team ID (UUID):', team.id);
      console.log('Current Captain ID (UUID):', user.id);
      console.log('New Captain ID (UUID):', newCaptainId);
      console.log('Team Name:', team.name);
      console.log('New Captain Name:', newCaptainName);
      
      // Get the price from the itemPrices state
      const price = itemPrices['Team Transfer'] || 15.00; // Default to 15.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      console.log('Generated Request ID:', requestId);
      
      // Get the item_id from the database
      const itemId = itemIds['Team Transfer'] || '1002'; // Use the fetched item_id or default to '1002'
      console.log('Using item ID from database:', itemId);
      
      // Create payment details for team transfer
      const paymentDetails = createPaymentDetails(
        'team_transfer',
        'Team Ownership Transfer',
        price,
        `Transfer ownership of ${team.name} to ${newCaptainName}`,
        {
          teamId: team.id,
          captainId: user.id,
          playerId: newCaptainId,
          item_id: itemId,
          request_id: requestId
        }
      );
      
      console.log('Created payment details:', paymentDetails);
      
      // Add metadata for the team change request
      paymentDetails.metadata = {
        requestType: 'team_transfer',
        oldCaptainId: user.id,
        oldCaptainName: user.email, // Use email instead of username
        newCaptainId: newCaptainId,
        newCaptainName: newCaptainName,
        teamName: team.name,
        requestId: requestId,
        // Store the data needed for creating the team change request
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          playerId: newCaptainId,
          oldValue: user.id,
          newValue: newCaptainId,
          metadata: {
            oldCaptainName: user.email,
            newCaptainName: newCaptainName,
            teamName: team.name
          }
        }
      };
      
      console.log('Final payment details with metadata:', JSON.stringify(paymentDetails, null, 2));
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails,
          // Don't include functions in the navigation state
          changeRequestType: 'team_transfer'
        }
      });
    } catch (err) {
      console.error('Error in handleTransferOwnership:', err);
      setError('Failed to process team transfer');
    }
  };

  const handlePlayerSigningRequest = () => {
    if (!team || !user) return;
    if (!playerEmail.trim() || !playerName.trim()) {
      setSigningError('Please provide both player email and name');
      return;
    }
    
    // Show confirmation dialog
    setSigningError(null);
    setShowPlayerSigningConfirmation(true);
  };

  const processPlayerSigningPayment = async () => {
    if (!team || !user || !playerEmail.trim() || !playerName.trim()) return;
    
    try {
      setProcessingPayment(true);
      
      // Get the price from the itemPrices state
      const price = itemPrices['Roster Change'] || 10.00; // Default to 10.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Get the item_id from the database
      const itemId = itemIds['Roster Change'] || '1005'; // Use the fetched item_id or default to '1005'
      console.log('Using item ID from database for player signing:', itemId);
      
      // Create payment details for player signing
      const paymentDetails = createPaymentDetails(
        'roster_change', // Changed to roster_change since there's no specific player_signing type
        'Player Signing Request',
        price,
        `Request to sign ${playerName} (${playerEmail}) to ${team.name}`,
        {
          teamId: team.id,
          captainId: user.id,
          item_id: itemId,
          request_id: requestId,
          playersIds: [] // Empty array since we don't have player IDs yet
        }
      );
      
      // Add player email and name to the metadata
      paymentDetails.metadata = {
        playerEmail,
        playerName,
        requestId,
        requestType: 'player_signing',
        // Store the data needed for creating the team change request
        changeRequestData: {
          teamId: team.id,
          requestedBy: user.id,
          itemId: itemId,
          oldValue: '',
          newValue: playerEmail,
          metadata: {
            playerEmail,
            playerName,
            teamName: team.name
          }
        }
      };
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails,
          changeRequestType: 'roster_change'
        }
      });
    } catch (err) {
      console.error(err);
      setSigningError('Failed to process player signing request');
      setProcessingPayment(false);
      setShowPlayerSigningConfirmation(false);
    }
  };

  // Team Actions Section
  const renderTeamActions = () => {
    if (!team) return null;

    return (
      <div className="card bg-base-200 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title flex justify-between">
            <span>Team Actions</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Team Rename Button */}
            <button 
              className="btn btn-primary flex items-center justify-start" 
              onClick={handleEditTeamName}
            >
              <Paintbrush className="w-5 h-5 mr-2" />
              <span>Rename Team</span>
            </button>
            
            {/* Transfer Ownership Button */}
            <button 
              className="btn btn-secondary flex items-center justify-start"
              onClick={() => alert('Transfer ownership not implemented in this view')}
            >
              <UserCog className="w-5 h-5 mr-2" />
              <span>Transfer Ownership</span>
            </button>

            {/* Add More Team Actions Here */}
          </div>
          
          {/* TeamActionProcessor integration - will be shown when an action is selected */}
          {showTeamRebrandProcessor && (
            <div className="mt-4 bg-gray-800 p-4 rounded-lg">
              <TeamActionProcessor
                actionType="team_rebrand"
                teamId={team.id}
                userId={user?.id || ''}
                initialValue={team.name}
                onSuccess={handleRebrandSuccess}
                onCancel={handleRebrandCancel}
                onError={setError}
                requiresPayment={true}
                paymentAmount={itemPrices['Team Rebrand'] || 20.00}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render online ID change processor when needed
  const renderOnlineIdProcessor = () => {
    if (!showOnlineIdProcessor || !selectedPlayerId) return null;
    
    const player = team?.members.find(member => member.user_id === selectedPlayerId);
    if (!player) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-base-200 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Change Online ID for {player.user?.username}</h2>
            
            <TeamActionProcessor
              actionType="online_id_change"
              teamId={team?.id || ''}
              userId={user?.id || ''}
              initialValue={player.user?.online_id || ''}
              onSuccess={handleOnlineIdSuccess}
              onCancel={handleOnlineIdCancel}
              onError={setError}
              requiresPayment={true}
              paymentAmount={itemPrices['Gamer Tag Change'] || 5.00}
            />
          </div>
        </div>
      </div>
    );
  };

  // Handle success from league registration
  const handleLeagueRegistrationSuccess = (response: any) => {
    console.log('League registration successful:', response);
    setShowLeagueRegistrationProcessor(false);
    // Refresh team data to show the updated rosters
    fetchTeamData();
  };

  // Handle cancellation of league registration
  const handleLeagueRegistrationCancel = () => {
    setShowLeagueRegistrationProcessor(false);
  };

  // Handle success from tournament registration
  const handleTournamentRegistrationSuccess = (response: any) => {
    console.log('Tournament registration successful:', response);
    setShowTournamentRegistrationProcessor(false);
    // Refresh team data to show the updated rosters
    fetchTeamData();
  };

  // Handle cancellation of tournament registration
  const handleTournamentRegistrationCancel = () => {
    setShowTournamentRegistrationProcessor(false);
  };

  // Handle success from roster change
  const handleRosterChangeSuccess = (response: any) => {
    console.log('Roster change successful:', response);
    setShowRosterChangeProcessor(false);
    // Refresh team data to show the updated roster
    fetchTeamData();
  };

  // Handle cancellation of roster change
  const handleRosterChangeCancel = () => {
    setShowRosterChangeProcessor(false);
  };
  
  // Handle success from team transfer
  const handleTeamTransferSuccess = (response: any) => {
    console.log('Team transfer successful:', response);
    setShowTeamTransferProcessor(false);
    // Usually will navigate away since user is no longer captain
    navigate('/dashboard');
  };

  // Handle cancellation of team transfer
  const handleTeamTransferCancel = () => {
    setShowTeamTransferProcessor(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-800 text-white p-4 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <div className="bg-blue-800 text-white p-6 rounded-lg shadow-lg mb-4 max-w-lg w-full">
          <h3 className="text-xl font-bold mb-4">No Team Found</h3>
          <p className="mb-4">This team was not found. You may need to create a team or navigate to a valid team page.</p>
          <button 
            className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-600"
            onClick={() => navigate('/create-team')}
          >
            Create a Team
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {team.name}
              {isCaptain && (
                <button
                  onClick={handleEditTeamName}
                  className="ml-2 text-gray-400 hover:text-white"
                  title="Edit Team Name"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </h1>
            <p className="text-gray-400">Team ID: {team.id}</p>
          </div>
        </div>

        {/* Non-captain view */}
        {!isCaptain && (
          <div>
            <p className="text-white mb-4">Welcome to the {team.name} page.</p>
            
            {/* Show rosters user is part of */}
            {userOnRoster ? (
              <div>
                {leagueRosters.length > 0 && (
                  <div className="bg-gray-700 p-4 rounded-lg mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">League Rosters</h2>
                    <div className="overflow-x-auto">
                      {/* League roster display */}
                      <table className="min-w-full bg-gray-800 text-white">
                        <thead>
                          <tr className="bg-gray-900">
                            <th className="py-2 px-4 text-left">League</th>
                            <th className="py-2 px-4 text-left">Status</th>
                            <th className="py-2 px-4 text-left">Players</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leagueRosters.map((roster: any) => (
                            <tr key={roster.id} className="border-t border-gray-700">
                              <td className="py-2 px-4">{roster.league_name}</td>
                              <td className="py-2 px-4">{roster.status}</td>
                              <td className="py-2 px-4">{roster.players?.length || 0} players</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {tournamentRosters.length > 0 && (
                  <div className="bg-gray-700 p-4 rounded-lg mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">Tournament Rosters</h2>
                    <div className="overflow-x-auto">
                      {/* Tournament roster display */}
                      <table className="min-w-full bg-gray-800 text-white">
                        <thead>
                          <tr className="bg-gray-900">
                            <th className="py-2 px-4 text-left">Tournament</th>
                            <th className="py-2 px-4 text-left">Status</th>
                            <th className="py-2 px-4 text-left">Players</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tournamentRosters.map((roster: any) => (
                            <tr key={roster.id} className="border-t border-gray-700">
                              <td className="py-2 px-4">{roster.tournament_name}</td>
                              <td className="py-2 px-4">{roster.status}</td>
                              <td className="py-2 px-4">{roster.players?.length || 0} players</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white">
                You are not currently on a League or Tournament roster. 
                Registered rosters you are a part of will appear here.
              </p>
            )}
          </div>
        )}

        {/* Captain view - entire dashboard */}
        {isCaptain && (
          <div>
            {/* Front Office Section */}
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Front Office</h2>
              <p className="text-gray-300 mb-4">Manage your team's registration, branding, and roster changes.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Team Actions */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Team Management</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={handleEditTeamName}
                      className="w-full text-left px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center"
                    >
                      <Paintbrush className="w-4 h-4 mr-2" />
                      <span>Rebrand Team (${itemPrices['Team Rebrand'] || 10.00})</span>
                    </button>
                  </div>
                </div>

                {/* Registration Actions */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Registration</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowLeagueRegistrationProcessor(true)}
                      className="w-full text-left px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      <span>League Registration (${itemPrices['League Registration'] || 50.00})</span>
                    </button>
                    <button 
                      onClick={() => setShowTournamentRegistrationProcessor(true)}
                      className="w-full text-left px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      <span>Tournament Registration (${itemPrices['Tournament Registration'] || 25.00})</span>
                    </button>
                  </div>
                </div>

                {/* Roster Actions */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Roster Management</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowRosterChangeProcessor(true)}
                      className="w-full text-left px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded flex items-center"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      <span>Roster Change (${itemPrices['Roster Change'] || 5.00})</span>
                    </button>
                    <button 
                      onClick={() => setShowOnlineIdProcessor(true)}
                      className="w-full text-left px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded flex items-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      <span>Online ID Change (${itemPrices['Gamer Tag Change'] || 5.00})</span>
                    </button>
                  </div>
                </div>

                {/* Team Transfer */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Ownership</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowTeamTransferProcessor(true)}
                      className="w-full text-left px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center"
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      <span>Transfer Team (${itemPrices['Team Transfer'] || 15.00})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TeamActionProcessor integration - will be shown when an action is selected */}
              {showTeamRebrandProcessor && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <TeamActionProcessor
                    actionType="team_rebrand"
                    teamId={team.id}
                    userId={user?.id || ''}
                    initialValue={team.name}
                    onSuccess={handleRebrandSuccess}
                    onCancel={handleRebrandCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['Team Rebrand'] || 20.00}
                  />
                </div>
              )}

              {showLeagueRegistrationProcessor && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <TeamActionProcessor
                    actionType="league_registration"
                    teamId={team.id}
                    userId={user?.id || ''}
                    initialValue=""
                    onSuccess={handleLeagueRegistrationSuccess}
                    onCancel={handleLeagueRegistrationCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['League Registration'] || 50.00}
                    members={team.members}
                  />
                </div>
              )}

              {showTournamentRegistrationProcessor && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <TeamActionProcessor
                    actionType="tournament_registration"
                    teamId={team.id}
                    userId={user?.id || ''}
                    initialValue=""
                    onSuccess={handleTournamentRegistrationSuccess}
                    onCancel={handleTournamentRegistrationCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['Tournament Registration'] || 25.00}
                    members={team.members}
                  />
                </div>
              )}

              {showRosterChangeProcessor && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <TeamActionProcessor
                    actionType="roster_change"
                    teamId={team.id}
                    userId={user?.id || ''}
                    initialValue=""
                    onSuccess={handleRosterChangeSuccess}
                    onCancel={handleRosterChangeCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['Roster Change'] || 5.00}
                    members={team.members}
                  />
                </div>
              )}

              {showTeamTransferProcessor && (
                <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                  <TeamActionProcessor
                    actionType="team_transfer"
                    teamId={team.id}
                    userId={user?.id || ''}
                    initialValue=""
                    onSuccess={handleTeamTransferSuccess}
                    onCancel={handleTeamTransferCancel}
                    onError={setError}
                    requiresPayment={true}
                    paymentAmount={itemPrices['Team Transfer'] || 15.00}
                    members={team.members}
                  />
                </div>
              )}
            </div>

            {/* League Rosters Section */}
            {leagueRosters.length > 0 && (
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold text-white mb-4">League Rosters</h2>
                {/* League roster display */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-800 text-white">
                    <thead>
                      <tr className="bg-gray-900">
                        <th className="py-2 px-4 text-left">League</th>
                        <th className="py-2 px-4 text-left">Status</th>
                        <th className="py-2 px-4 text-left">Players</th>
                        <th className="py-2 px-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leagueRosters.map((roster: any) => (
                        <tr key={roster.id} className="border-t border-gray-700">
                          <td className="py-2 px-4">{roster.league_name}</td>
                          <td className="py-2 px-4">{roster.status}</td>
                          <td className="py-2 px-4">{roster.players?.length || 0} players</td>
                          <td className="py-2 px-4">
                            <button
                              onClick={() => alert('Manage League Roster')}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tournament Rosters Section */}
            {tournamentRosters.length > 0 && (
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Tournament Rosters</h2>
                {/* Tournament roster display */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-800 text-white">
                    <thead>
                      <tr className="bg-gray-900">
                        <th className="py-2 px-4 text-left">Tournament</th>
                        <th className="py-2 px-4 text-left">Status</th>
                        <th className="py-2 px-4 text-left">Players</th>
                        <th className="py-2 px-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentRosters.map((roster: any) => (
                        <tr key={roster.id} className="border-t border-gray-700">
                          <td className="py-2 px-4">{roster.tournament_name}</td>
                          <td className="py-2 px-4">{roster.status}</td>
                          <td className="py-2 px-4">{roster.players?.length || 0} players</td>
                          <td className="py-2 px-4">
                            <button
                              onClick={() => alert('Manage Tournament Roster')}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Free Agency Section */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Free Agency</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800 text-white">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="py-2 px-4 text-left">Player</th>
                      <th className="py-2 px-4 text-left">Role</th>
                      <th className="py-2 px-4 text-left">Online ID</th>
                      <th className="py-2 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.members.map((member) => (
                      <tr key={member.user_id} className="border-t border-gray-700">
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            {member.user?.avatar_url && (
                              <img 
                                src={member.user.avatar_url} 
                                alt={member.user.username || 'Player'} 
                                className="w-8 h-8 rounded-full mr-2"
                              />
                            )}
                            <div>
                              <div className="font-medium">{member.user?.username || 'Unknown Player'}</div>
                              <div className="text-gray-400 text-sm">{member.user?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-4">{member.role}</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            <span>{member.user?.online_id || 'Not set'}</span>
                            <button
                              onClick={() => handleEditOnlineId(member.user_id)}
                              className="ml-2 text-gray-400 hover:text-white"
                              title="Edit Online ID"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          {member.user_id !== team.captain_id && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleRemovePlayer(member.user_id)}
                                className="text-red-500 hover:text-red-400"
                                title="Remove Player"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleTransferOwnership(member.user_id, member.user?.username || 'Player')}
                                className="text-yellow-500 hover:text-yellow-400"
                                title="Transfer Ownership"
                              >
                                <UserCog className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          {member.user_id === team.captain_id && (
                            <span className="text-green-500 text-sm">Captain</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={handleAddPlayer}
                  className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-600 text-sm flex items-center"
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Add Player
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Render online ID processor as a modal */}
      {renderOnlineIdProcessor()}

      {/* Show confirmation dialogs */}
      <ConfirmationDialog
        isOpen={showOnlineIdConfirmation}
        title="Confirm Online ID Change"
        message={`Are you sure you want to change the online ID to "${newOnlineId}"? This may require a payment.`}
        confirmText="Continue to Payment"
        cancelText="Cancel"
        onConfirm={processOnlineIdChangePayment}
        onCancel={() => setShowOnlineIdConfirmation(false)}
        type="warning"
      />

      <ConfirmationDialog
        isOpen={showRebrandConfirmation}
        title="Confirm Team Name Change"
        message={`Are you sure you want to rename the team from "${team?.name}" to "${newTeamName}"? This requires a payment.`}
        confirmText="Continue to Payment"
        cancelText="Cancel"
        onConfirm={processTeamRebrandPayment}
        onCancel={() => setShowRebrandConfirmation(false)}
        type="warning"
      />

      <ConfirmationDialog
        isOpen={showPlayerSigningConfirmation}
        title="Confirm Player Signing Request"
        message={`Are you sure you want to request signing ${playerName} (${playerEmail}) to your team? This requires a payment.`}
        confirmText="Continue to Payment"
        cancelText="Cancel"
        onConfirm={processPlayerSigningPayment}
        onCancel={() => setShowPlayerSigningConfirmation(false)}
        type="warning"
      />
    </div>
  );
};

export default TeamDashboard;