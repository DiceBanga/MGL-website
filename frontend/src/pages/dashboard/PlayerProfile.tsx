import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Globe, Edit, Save, X, Users, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { DbPlayer, DbTeamMember } from '../../types/database';

interface Player {
  user_id: string;
  display_name: string;
  email: string;
  online_id: string | null;
  avatar_url: string | null;
}

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  role: string;
  jersey_number: number | null;
  isCaptain: boolean;
}

interface JoinRequest {
  id: string;
  team_id: string;
  team_name: string;
  team_logo: string | null;
  created_at: string;
}

const PlayerProfile = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Player>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchPlayerData();
  }, [user, navigate]);

  const fetchPlayerData = async () => {
    if (!user) return;

    try {
      // Fetch player data
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (playerError) {
        console.error('Error fetching player data:', playerError);
        return;
      }

      setPlayer(playerData as DbPlayer);
      setFormData({
        display_name: playerData.display_name,
        online_id: playerData.online_id || '',
      });

      // Fetch teams the player is a member of
      const { data: teamsData, error: teamsError } = await supabase
        .from('team_players')
        .select(`
          team_id,
          role,
          jersey_number,
          teams (
            id,
            name,
            logo_url,
            captain_id
          )
        `)
        .eq('user_id', user.id);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return;
      }

      // Fix the type issue by using a more specific type
      interface TeamWithTeamData extends DbTeamMember {
        teams: {
          id: string;
          name: string;
          logo_url: string | null;
          captain_id: string;
        };
      }

      setTeams(((teamsData || []) as unknown as TeamWithTeamData[]).map(team => ({
        id: team.team_id,
        name: team.teams.name,
        logo_url: team.teams.logo_url,
        role: team.role,
        jersey_number: team.jersey_number,
        isCaptain: team.teams.captain_id === user.id
      })));

      // Fetch pending join requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('team_join_requests')
        .select(`
          id,
          team_id,
          status,
          created_at,
          teams (
            name,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (requestsError) {
        console.error('Error fetching join requests:', requestsError);
        return;
      }

      // Fix the type issue for join requests
      interface JoinRequestWithTeamData {
        id: string;
        team_id: string;
        status: string;
        created_at: string;
        teams: {
          name: string;
          logo_url: string | null;
        };
      }

      setJoinRequests(((requestsData || []) as unknown as JoinRequestWithTeamData[]).map(request => ({
        id: request.id,
        team_id: request.team_id,
        team_name: request.teams.name,
        team_logo: request.teams.logo_url,
        created_at: new Date(request.created_at).toLocaleDateString()
      })));

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchPlayerData:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('players')
      .update(formData)
      .eq('user_id', user?.id);

    if (error) {
      console.error('Error updating profile:', error);
      return;
    }

    setPlayer(prev => prev ? { ...prev, ...formData } : null);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Player Profile</h1>
      
      {player && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-700 mr-4 overflow-hidden">
              {player.avatar_url ? (
                <img src={player.avatar_url} alt={player.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={32} className="text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{player.display_name}</h2>
              <p className="text-gray-400">{player.email}</p>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="ml-auto p-2 text-gray-400 hover:text-white"
                aria-label="Edit profile"
              >
                <Edit size={18} />
              </button>
            )}
          </div>
          
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="display_name" className="block text-gray-400 mb-1">Display Name</label>
                <input
                  id="display_name"
                  name="display_name"
                  value={formData.display_name || ''}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="online_id" className="block text-gray-400 mb-1">Online ID</label>
                <input
                  id="online_id"
                  name="online_id"
                  value={formData.online_id || ''}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-600 rounded"
                >
                  <X size={16} className="inline mr-1" /> Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded"
                >
                  <Save size={16} className="inline mr-1" /> Save
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {player.online_id && (
                <div className="flex items-center">
                  <Globe size={16} className="text-gray-400 mr-2" />
                  <span>Online ID: {player.online_id}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Users className="mr-2" /> My Teams
          </h2>
          
          {teams.length > 0 ? (
            <div className="space-y-4">
              {teams.map(team => (
                <div key={team.id} className="flex items-center p-3 bg-gray-700 rounded">
                  <div className="w-10 h-10 rounded bg-gray-600 mr-3 overflow-hidden">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users size={20} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{team.name}</h3>
                    <p className="text-sm text-gray-400">
                      {team.role} {team.jersey_number && `#${team.jersey_number}`}
                      {team.isCaptain && ' (Captain)'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard/team/${team.id}`)}
                    className="ml-auto px-3 py-1 bg-gray-600 rounded text-sm"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">You are not a member of any teams yet.</p>
          )}
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Trophy className="mr-2" /> Join Requests
          </h2>
          
          {joinRequests.length > 0 ? (
            <div className="space-y-4">
              {joinRequests.map(request => (
                <div key={request.id} className="flex items-center p-3 bg-gray-700 rounded">
                  <div className="w-10 h-10 rounded bg-gray-600 mr-3 overflow-hidden">
                    {request.team_logo ? (
                      <img src={request.team_logo} alt={request.team_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users size={20} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{request.team_name}</h3>
                    <p className="text-sm text-gray-400">Requested: {request.created_at}</p>
                  </div>
                  <span className="ml-auto px-3 py-1 bg-yellow-600 rounded-full text-xs">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">You don't have any pending join requests.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile; 