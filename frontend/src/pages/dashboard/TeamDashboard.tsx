import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Edit, UserPlus, Trash, RefreshCw, DollarSign, Users, Trophy, UserCog, Paintbrush, ChevronRight } from 'lucide-react';
import { DbTeam, DbTeamMember } from '../../types/database';
import { createPaymentDetails } from '../../utils/paymentUtils';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { v4 as uuidv4 } from 'uuid';

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
  
  // Front Office state
  const [showFrontOffice, setShowFrontOffice] = useState(true);
  const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([]);
  const [itemPrices, setItemPrices] = useState<{[key: string]: number}>({});
  
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

  useEffect(() => {
    if (user) {
      fetchTeamData();
      fetchAvailableEvents();
      fetchItemPrices();
    }
  }, [user]);

  const fetchTeamData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First, get the team the user is a captain of
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('captain_id', user.id)
        .single();

      if (teamError) {
        if (teamError.code === 'PGRST116') {
          setError('You are not a captain of any team.');
        } else {
          setError(teamError.message);
        }
        setLoading(false);
        return;
      }

      // Then, get all members of the team
      const { data: membersData, error: membersError } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', teamData.id);

      if (membersError) {
        setError(membersError.message);
        setLoading(false);
        return;
      }
      
      // Fetch user details separately if needed
      const userIds = membersData.map((member: any) => member.user_id);
      let userData: any[] = [];
      
      if (userIds.length > 0) {
        // Fetch from players table
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('user_id, display_name, email, avatar_url')
          .in('user_id', userIds);
          
        if (playersError) {
          console.error('Error fetching player data:', playersError);
          console.warn('Unable to fetch player details. Some player information may be missing.');
        } else if (players) {
          // Map player data to match user interface
          userData = players.map(player => ({
            id: player.user_id,
            username: player.display_name,
            email: player.email,
            avatar_url: player.avatar_url
          }));
        }
        
        // Fetch online IDs from league_roster table if needed
        try {
          const { data: leagueRosters, error: leagueRostersError } = await supabase
            .from('league_roster')
            .select('player_id, online_id')
            .in('player_id', userIds);
            
          if (!leagueRostersError && leagueRosters && leagueRosters.length > 0) {
            // Add online_id to userData
            userData = userData.map(user => {
              const roster = leagueRosters.find(r => r.player_id === user.id);
              return {
                ...user,
                online_id: roster?.online_id || null
              };
            });
          }
        } catch (err) {
          console.warn('Unable to fetch online IDs from league_roster:', err);
        }
      }

      // Transform the data to match our UI interface
      const teamWithMembers: TeamUI = {
        ...teamData,
        members: membersData.map((member: any) => {
          const userInfo = userData.find(u => u.id === member.user_id);
          return {
            ...member,
            id: member.user_id, // Use user_id as the id property since team_players doesn't have an id field
            user: userInfo || {
              id: member.user_id,
              username: `Player ${member.user_id.substring(0, 8)}`,
              email: '',
              avatar_url: null
            }
          };
        })
      };

      setTeam(teamWithMembers);
      setNewTeamName(teamData.name);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
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
        .select('item_id, current_price, item_name')
        .in('item_id', ['1001', '1002', '1003', '1004', '1005', '1006', '1007']); // All relevant items
        
      if (!error && data) {
        const prices: {[key: string]: number} = {};
        data.forEach(item => {
          prices[item.item_id] = item.current_price;
        });
        setItemPrices(prices);
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
    setIsEditingName(true);
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
      const price = itemPrices['1006'] || 20.00; // Default to 20.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Create payment details for team rebranding
      const paymentDetails = createPaymentDetails(
        'team_rebrand',
        'Team Name Change',
        price,
        `Change team name from "${team.name}" to "${newTeamName}"`,
        {
          teamId: team.id,
          captainId: user.id,
          item_id: '1006', // Item ID for team rebranding
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
          itemId: '1006',
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

  const handleEditOnlineId = (playerId: string) => {
    setSelectedPlayerId(playerId);
    
    // Find the player's current online_id
    const player = team?.members.find(member => member.user_id === playerId);
    if (player) {
      // Get online_id from the user object
      const onlineId = player.user?.online_id || '';
      setNewOnlineId(onlineId);
    }
    
    setIsEditingOnlineId(true);
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
      const price = itemPrices['1007'] || 5.00; // Default to 5.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
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
          item_id: '1007', // Item ID for online ID change
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
          itemId: '1007',
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
          item_id: '1003', // Item ID for tournament registration
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
          item_id: '1004', // Item ID for league registration
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
      // Get the price from the itemPrices state
      const price = itemPrices['1002'] || 15.00; // Default to 15.00 if not found
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
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
          item_id: '1002', // Item ID for team transfer
          request_id: requestId
        }
      );
      
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
          itemId: '1002',
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
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { 
        state: { 
          paymentDetails,
          // Don't include functions in the navigation state
          changeRequestType: 'team_transfer'
        }
      });
    } catch (err) {
      console.error(err);
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
      const price = itemPrices['1005'] || 10.00; // Default to 10.00 if not found - using Roster Change item
      
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Create payment details for player signing
      const paymentDetails = createPaymentDetails(
        'roster_change', // Changed to roster_change since there's no specific player_signing type
        'Player Signing Request',
        price,
        `Request to sign ${playerName} (${playerEmail}) to ${team.name}`,
        {
          teamId: team.id,
          captainId: user.id,
          item_id: '1005', // Item ID for roster change
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
          itemId: '1005',
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 text-red-500 p-4 rounded-lg mb-6">
            <p>{error}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="bg-gray-900 min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <h1 className="text-2xl font-bold text-white mb-4">No Team Found</h1>
            <p className="text-gray-300 mb-4">
              You are not currently a captain of any team. Would you like to create a new team?
            </p>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="bg-green-500/10 p-2 rounded-lg mr-3">
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Team Creation</h3>
                    <p className="text-gray-400 text-sm">Create a new team and become the captain</p>
                  </div>
                </div>
                <div className="text-green-500 font-medium">
                  ${itemPrices['1001'] || '25.00'}
                </div>
              </div>
              <button
                onClick={() => navigate('/dashboard/create-team')}
                className="mt-2 px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm w-full"
              >
                Create Team - ${itemPrices['1001'] || '25.00'}
              </button>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Team Dashboard</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Team Information */}
          <div className="bg-gray-700 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Team Information</h2>
              <button
                onClick={fetchTeamData}
                className="p-2 bg-gray-600 text-gray-300 rounded hover:bg-gray-500 flex items-center"
                title="Refresh team data"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Team Name</p>
                {isEditingName ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="bg-gray-800 text-white p-2 rounded mr-2 flex-grow"
                      placeholder="Enter team name"
                      aria-label="Team name"
                    />
                    <button
                      onClick={handleSaveTeamName}
                      className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm"
                      disabled={processingPayment}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setNewTeamName(team.name);
                      }}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm ml-2"
                      disabled={processingPayment}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <p className="text-white font-medium">{team.name}</p>
                    <button
                      onClick={handleEditTeamName}
                      className="ml-2 text-gray-400 hover:text-white"
                      title="Edit team name"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Team ID</p>
                <p className="text-white font-medium">{team.id}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Created At</p>
                <p className="text-white font-medium">
                  {new Date(team.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Captain</p>
                <p className="text-white font-medium">{user?.email || 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Team Roster */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Team Roster</h2>
              <button
                onClick={handleAddPlayer}
                className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 flex items-center text-sm"
              >
                <UserPlus size={16} className="mr-1" />
                Add Player
              </button>
            </div>

            {isEditingOnlineId && (
              <div className="bg-gray-800 p-4 rounded-lg mb-4">
                <h3 className="text-white font-medium mb-2">Edit Online ID</h3>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newOnlineId}
                    onChange={(e) => setNewOnlineId(e.target.value)}
                    className="bg-gray-700 text-white p-2 rounded mr-2 flex-grow"
                    placeholder="Enter online ID"
                  />
                  <button
                    onClick={handleSaveOnlineId}
                    className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm"
                    disabled={processingPayment}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingOnlineId(false);
                      setSelectedPlayerId(null);
                    }}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm ml-2"
                    disabled={processingPayment}
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-yellow-500 text-sm mt-2">
                  <DollarSign size={14} className="inline mr-1" />
                  Changing online ID requires a $${itemPrices['1007'] || '5.00'} fee
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-400 text-sm">Player</th>
                    <th className="px-4 py-2 text-left text-gray-400 text-sm">Role</th>
                    <th className="px-4 py-2 text-left text-gray-400 text-sm">Online ID</th>
                    <th className="px-4 py-2 text-left text-gray-400 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((member) => (
                    <tr key={member.user_id} className="border-t border-gray-700">
                      <td className="px-4 py-3 text-white">
                        {member.user?.username || member.user?.email || member.user_id || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {member.user_id === team.captain_id ? 'Captain' : 'Player'}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {member.user?.online_id || 'Not set'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditOnlineId(member.user_id)}
                            className="p-1 text-gray-400 hover:text-white"
                            title="Edit online ID"
                          >
                            <Edit size={16} />
                          </button>
                          {member.user_id !== team.captain_id && (
                            <button
                              onClick={() => handleRemovePlayer(member.user_id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                              title="Remove player"
                            >
                              <Trash size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Front Office Section */}
          <div className="bg-gray-700 p-4 rounded-lg mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Front Office</h2>
              <button
                onClick={() => setShowFrontOffice(!showFrontOffice)}
                className="p-2 bg-gray-600 text-gray-300 rounded hover:bg-gray-500 flex items-center"
                title={showFrontOffice ? "Hide Front Office" : "Show Front Office"}
              >
                <ChevronRight size={16} className={`transform transition-transform ${showFrontOffice ? 'rotate-90' : ''}`} />
              </button>
            </div>
            
            {showFrontOffice && (
              <div className="space-y-4">
                {/* Player Signing Request */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="bg-green-500/10 p-2 rounded-lg mr-3">
                        <UserPlus className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Player Signing Request</h3>
                        <p className="text-gray-400 text-sm">Request to sign a player to your roster</p>
                      </div>
                    </div>
                    <div className="text-green-500 font-medium">
                      ${itemPrices['1005'] || '10.00'}
                    </div>
                  </div>
                  
                  {showPlayerSigningForm ? (
                    <div className="mt-3">
                      {signingError && (
                        <div className="bg-red-900/20 border border-red-500 text-red-500 p-2 rounded-lg mb-3 text-sm">
                          {signingError}
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="playerEmail" className="block text-gray-400 text-sm mb-1">
                            Player Email
                          </label>
                          <input
                            id="playerEmail"
                            type="email"
                            value={playerEmail}
                            onChange={(e) => setPlayerEmail(e.target.value)}
                            className="w-full bg-gray-700 text-white p-2 rounded"
                            placeholder="player@example.com"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="playerName" className="block text-gray-400 text-sm mb-1">
                            Player Name
                          </label>
                          <input
                            id="playerName"
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className="w-full bg-gray-700 text-white p-2 rounded"
                            placeholder="Player Name"
                          />
                        </div>
                        
                        <div className="flex justify-between">
                          <button
                            onClick={() => {
                              setShowPlayerSigningForm(false);
                              setPlayerEmail('');
                              setPlayerName('');
                              setSigningError(null);
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm"
                            disabled={processingPayment}
                          >
                            Cancel
                          </button>
                          
                          <button
                            onClick={handlePlayerSigningRequest}
                            className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm"
                            disabled={processingPayment}
                          >
                            Submit Request
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPlayerSigningForm(true)}
                      className="mt-2 px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm w-full"
                    >
                      Request Player Signing
                    </button>
                  )}
                </div>
                
                {/* Online ID Change */}
                <div 
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors"
                  onClick={() => setIsEditingOnlineId(true)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-green-500/10 p-2 rounded-lg mr-3">
                        <UserCog className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Online ID Change</h3>
                        <p className="text-gray-400 text-sm">Change a player's online ID</p>
                      </div>
                    </div>
                    <div className="text-green-500 font-medium">
                      ${itemPrices['1007'] || '5.00'}
                    </div>
                  </div>
                </div>
                
                {/* Team Rebrand */}
                <div 
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors"
                  onClick={handleEditTeamName}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-green-500/10 p-2 rounded-lg mr-3">
                        <Paintbrush className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Team Rebrand</h3>
                        <p className="text-gray-400 text-sm">Change your team's name</p>
                      </div>
                    </div>
                    <div className="text-green-500 font-medium">
                      ${itemPrices['1006'] || '20.00'}
                    </div>
                  </div>
                </div>
                
                {/* Tournament Registration */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="bg-green-500/10 p-2 rounded-lg mr-3">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Tournament Registration</h3>
                      <p className="text-gray-400 text-sm">Register for upcoming tournaments</p>
                    </div>
                  </div>
                  
                  {availableTournaments.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {availableTournaments.map(tournament => (
                        <div key={tournament.id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                          <span className="text-white">{tournament.name}</span>
                          <button
                            onClick={() => handleJoinTournament(tournament.id, tournament.name, tournament.payment_amount || itemPrices['1003'] || 75.00)}
                            className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm"
                          >
                            Join ${tournament.payment_amount || itemPrices['1003'] || '75.00'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm mt-2">No tournaments available for registration</p>
                  )}
                </div>
                
                {/* League Registration */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="bg-green-500/10 p-2 rounded-lg mr-3">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">League Registration</h3>
                      <p className="text-gray-400 text-sm">Register for active leagues</p>
                    </div>
                  </div>
                  
                  {availableLeagues.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {availableLeagues.map(league => (
                        <div key={league.id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                          <span className="text-white">{league.name}</span>
                          <button
                            onClick={() => handleJoinLeague(league.id, league.name, league.payment_amount || itemPrices['1004'] || 100.00)}
                            className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm"
                          >
                            Join ${league.payment_amount || itemPrices['1004'] || '100.00'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm mt-2">No leagues available for registration</p>
                  )}
                </div>
                
                {/* Transfer Ownership */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="bg-green-500/10 p-2 rounded-lg mr-3">
                      <Users className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Transfer Ownership</h3>
                      <p className="text-gray-400 text-sm">Transfer team ownership to another player</p>
                    </div>
                  </div>
                  
                  {team.members.filter(member => member.user_id !== team.captain_id).length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {team.members
                        .filter(member => member.user_id !== team.captain_id)
                        .map(member => (
                          <div key={member.user_id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                            <span className="text-white">{member.user?.username || member.user_id}</span>
                            <button
                              onClick={() => handleTransferOwnership(
                                member.user_id, 
                                member.user?.username || member.user_id
                              )}
                              className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 text-sm"
                            >
                              Transfer ${itemPrices['1002'] || '15.00'}
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm mt-2">No team members available to transfer ownership to</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Confirmation Dialog for Online ID Change */}
      <ConfirmationDialog
        isOpen={showOnlineIdConfirmation}
        title="Confirm Online ID Change"
        message={`Changing the online ID will incur a $2.00 fee. Do you want to proceed with changing the online ID to "${newOnlineId}"?`}
        confirmText="Proceed to Payment"
        cancelText="Cancel"
        onConfirm={processOnlineIdChangePayment}
        onCancel={() => setShowOnlineIdConfirmation(false)}
        type="warning"
        isLoading={processingPayment}
      />
      
      {/* Confirmation Dialog for Team Rebrand */}
      <ConfirmationDialog
        isOpen={showRebrandConfirmation}
        title="Confirm Team Name Change"
        message={`Changing the team name will incur a $5.00 fee. Do you want to proceed with changing the team name from "${team?.name}" to "${newTeamName}"?`}
        confirmText="Proceed to Payment"
        cancelText="Cancel"
        onConfirm={processTeamRebrandPayment}
        onCancel={() => setShowRebrandConfirmation(false)}
        type="warning"
        isLoading={processingPayment}
      />
      
      {/* Confirmation Dialog for Player Signing Request */}
      <ConfirmationDialog
        isOpen={showPlayerSigningConfirmation}
        title="Confirm Player Signing Request"
        message={`Requesting to sign ${playerName} (${playerEmail}) to your team will incur a $${itemPrices['1001'] || '5.00'} fee. Do you want to proceed?`}
        confirmText="Proceed to Payment"
        cancelText="Cancel"
        onConfirm={processPlayerSigningPayment}
        onCancel={() => setShowPlayerSigningConfirmation(false)}
        type="warning"
        isLoading={processingPayment}
      />
    </div>
  );
};

export default TeamDashboard;