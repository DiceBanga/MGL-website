import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Edit, UserPlus, Trash, RefreshCw, DollarSign } from 'lucide-react';
import { DbTeam, DbTeamMember } from '../../types/database';
import { createPaymentDetails } from '../../utils/paymentUtils';
import ConfirmationDialog from '../../components/ConfirmationDialog';

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
  
  // Confirmation dialog states
  const [showOnlineIdConfirmation, setShowOnlineIdConfirmation] = useState(false);
  const [showRebrandConfirmation, setShowRebrandConfirmation] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTeamData();
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
      
      // Create payment details for team rebranding
      const paymentDetails = createPaymentDetails(
        'team_rebrand',
        'Team Name Change',
        5.00,
        `Change team name from "${team.name}" to "${newTeamName}"`,
        {
          teamId: team.id,
          captainId: user.id,
          item_id: '1007' // Item ID for team rebranding
        }
      );
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { state: { paymentDetails } });
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
      
      // Create payment details for online ID change
      const paymentDetails = createPaymentDetails(
        'online_id_change',
        'Online ID Change',
        2.00,
        `Change online ID from "${currentOnlineId}" to "${newOnlineId}"`,
        {
          teamId: team.id,
          captainId: user.id,
          playerId: selectedPlayerId,
          item_id: '1006' // Item ID for online ID change
        }
      );
      
      // Navigate to the payment page with the payment details
      navigate('/payments', { state: { paymentDetails } });
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
            <button
              onClick={() => navigate('/dashboard/create-team')}
              className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600"
            >
              Create Team
            </button>
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
                  Changing online ID requires a $2.00 fee
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
    </div>
  );
};

export default TeamDashboard;